import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type {
  OfflineQueryOptions,
  OfflineQueryResult,
  OfflineQueryStatus,
} from '../types/index.js';
import { useOfflineEngine } from '../context/OfflineContext.js';

type CacheShape<T> = { data: T; lastSynced: number };

/**
 * Reads cached query data, refetches when online, and persists results under the configured store.
 */
export function useOfflineQuery<T>(options: OfflineQueryOptions<T>): OfflineQueryResult<T> {
  const engine = useOfflineEngine();
  const storageKey = options.key;
  const staleTime = options.staleTime ?? 60_000;
  const cacheTime = options.cacheTime ?? 86_400_000;
  const fetcherRef = useRef(options.fetcher);
  fetcherRef.current = options.fetcher;

  const [data, setData] = useState<T | undefined>(undefined);
  const dataRef = useRef<T | undefined>(undefined);
  dataRef.current = data;

  const [lastSyncedMs, setLastSyncedMs] = useState<number | null>(null);
  const [status, setStatus] = useState<OfflineQueryStatus>('loading');

  const subscribe = useCallback(
    (onChange: () => void) => engine?.subscribe(onChange) ?? (() => {}),
    [engine]
  );
  const getSnapshot = useCallback(() => engine?.network.getStatus().isOnline ?? true, [engine]);
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, () => true);

  const refetch = useCallback(async () => {
    const fetcher = fetcherRef.current;
    const online = engine?.network.getStatus().isOnline ?? true;
    if (!online) {
      setStatus((s) => (dataRef.current !== undefined ? 'stale' : s));
      return;
    }
    try {
      setStatus((s) => (dataRef.current !== undefined && s !== 'error' ? s : 'loading'));
      const result = await fetcher();
      const now = Date.now();
      setData(result);
      setLastSyncedMs(now);
      if (engine) {
        await engine.cacheSet<CacheShape<T>>(
          storageKey,
          { data: result, lastSynced: now },
          cacheTime
        );
      }
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }, [cacheTime, engine, storageKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (engine) {
        const cached = await engine.cacheGet<CacheShape<T>>(storageKey);
        if (cancelled) return;
        if (cached) {
          setData(cached.data);
          setLastSyncedMs(cached.lastSynced);
          const age = Date.now() - cached.lastSynced;
          setStatus(age > staleTime ? 'stale' : 'success');
        }
      }
      if (cancelled) return;
      const online = engine?.network.getStatus().isOnline ?? true;
      if (online || !engine) {
        await refetch();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [engine, staleTime, storageKey, refetch]);

  const prevOnline = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !prevOnline.current) {
      const stale = lastSyncedMs != null ? Date.now() - lastSyncedMs > staleTime : false;
      if (stale || status === 'stale') void refetch();
    }
    prevOnline.current = isOnline;
  }, [isOnline, lastSyncedMs, refetch, staleTime, status]);

  const lastSynced = lastSyncedMs != null ? new Date(lastSyncedMs) : null;
  const isStale =
    lastSyncedMs != null ? Date.now() - lastSyncedMs > staleTime : status === 'loading';

  const derivedStatus: OfflineQueryStatus = status === 'success' && isStale ? 'stale' : status;

  return {
    data,
    status: derivedStatus,
    isStale,
    lastSynced,
    refetch,
  };
}

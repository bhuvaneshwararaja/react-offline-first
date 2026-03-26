import { useCallback, useEffect, useState } from 'react';
import { useOfflineEngine } from '../context/OfflineContext.js';

/**
 * Subscribes to debounced online/offline state and exposes a manual `ping()` (HEAD request).
 * Without `OfflineProvider`, returns a stable online SSR-safe default.
 */
export function useNetworkStatus(): {
  isOnline: boolean;
  isOffline: boolean;
  since: Date | null;
  ping: () => Promise<boolean>;
} {
  const engine = useOfflineEngine();
  const [isOnline, setIsOnline] = useState(true);
  const [since, setSince] = useState<Date | null>(null);

  useEffect(() => {
    if (!engine) {
      setIsOnline(true);
      setSince(null);
      return;
    }
    const s = engine.network.getStatus();
    setIsOnline(s.isOnline);
    setSince(s.since);
    return engine.network.subscribe(() => {
      const n = engine.network.getStatus();
      setIsOnline(n.isOnline);
      setSince(n.since);
    });
  }, [engine]);

  const ping = useCallback(async () => {
    if (!engine) return true;
    return engine.network.ping();
  }, [engine]);

  return {
    isOnline,
    isOffline: !isOnline,
    since,
    ping,
  };
}

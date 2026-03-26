import { useCallback, useSyncExternalStore } from 'react';
import type { QueueResult, QueuedMutation } from '../types/index.js';
import { useOfflineEngine } from '../context/OfflineContext.js';

/** Inspect or mutate the full durable mutation queue (all keys). */
export function useQueue(): QueueResult {
  const engine = useOfflineEngine();

  const subscribe = useCallback(
    (onStoreChange: () => void) => engine?.subscribe(onStoreChange) ?? (() => {}),
    [engine]
  );

  const queue = useSyncExternalStore(
    subscribe,
    (): QueuedMutation[] => engine?.queue.list() ?? [],
    (): QueuedMutation[] => []
  );

  const retry = useCallback(
    (id: string) => {
      engine?.retry(id);
    },
    [engine]
  );

  const remove = useCallback(
    (id: string) => {
      engine?.remove(id);
    },
    [engine]
  );

  const clear = useCallback(() => {
    void engine?.clearQueue();
  }, [engine]);

  return { queue, retry, remove, clear };
}

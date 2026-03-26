import { useCallback, useSyncExternalStore } from 'react';
import type { ConflictRecord, ConflictResult } from '../types/index.js';
import { useOfflineEngine } from '../context/OfflineContext.js';

/**
 * Surfaces unresolved conflicts when the global or per-mutation strategy is `manual`.
 * Call `resolve(id, 'local' | 'remote')` to continue.
 */
export function useConflict(): ConflictResult {
  const engine = useOfflineEngine();

  const subscribe = useCallback(
    (onStoreChange: () => void) => engine?.subscribe(onStoreChange) ?? (() => {}),
    [engine]
  );

  const conflicts = useSyncExternalStore(
    subscribe,
    (): ConflictRecord[] => engine?.getConflicts() ?? [],
    (): ConflictRecord[] => []
  );

  const resolve = useCallback(
    (id: string, side: 'local' | 'remote') => {
      engine?.resolveConflict(id, side);
    },
    [engine]
  );

  return { conflicts, resolve };
}

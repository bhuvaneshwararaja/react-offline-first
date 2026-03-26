import { createContext, useContext } from 'react';
import type { OfflineEngine } from '../core/engine.js';

export const OfflineContext = createContext<OfflineEngine | null>(null);

/**
 * Low-level access to the active `OfflineEngine`. Returns `null` outside `OfflineProvider`.
 */
export function useOfflineEngine(): OfflineEngine | null {
  return useContext(OfflineContext);
}

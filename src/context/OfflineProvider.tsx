import { useEffect, useRef, type ReactNode } from 'react';
import type { OfflineConfig } from '../types/index.js';
import { OfflineEngine } from '../core/engine.js';
import { OfflineContext } from './OfflineContext.js';

/** Props for `OfflineProvider`. */
export interface OfflineProviderProps {
  config?: OfflineConfig;
  children: ReactNode;
}

/**
 * Mounts the offline engine (storage, network monitor, sync queue) and exposes it to hooks.
 * Use once near the root of the app.
 */
export function OfflineProvider({ config, children }: OfflineProviderProps): React.ReactElement {
  const isSSR = typeof window === 'undefined';
  const engineRef = useRef<OfflineEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new OfflineEngine(config, isSSR);
  }

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    void engine.init();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  return <OfflineContext.Provider value={engineRef.current}>{children}</OfflineContext.Provider>;
}

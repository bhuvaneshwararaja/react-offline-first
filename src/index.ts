/**
 * Offline-first primitives for React: `OfflineProvider`, cached queries, a durable mutation
 * queue, network status, and optional service worker registration.
 *
 * @packageDocumentation
 */

export { OfflineProvider } from './context/OfflineProvider.js';
export type { OfflineProviderProps } from './context/OfflineProvider.js';
export { OfflineContext, useOfflineEngine } from './context/OfflineContext.js';

export {
  useNetworkStatus,
  useOfflineQuery,
  useMutation,
  useQueue,
  useConflict,
} from './hooks/index.js';

export { MemoryAdapter, IndexedDBAdapter, LocalStorageAdapter } from './adapters/index.js';

export { registerServiceWorker } from './sw.js';

export { OfflineError } from './types/index.js';
export type {
  BatchOperation,
  ConflictRecord,
  ConflictResult,
  ConflictStrategy,
  ConflictResolver,
  MutationOptions,
  MutationResult,
  MutationStatus,
  NetworkStatus,
  NetworkStatusChangeEvent,
  OfflineConfig,
  OfflineQueryOptions,
  OfflineQueryResult,
  OfflineQueryStatus,
  QueueResult,
  QueuedMutation,
  RetryBackoff,
  StorageAdapter,
} from './types/index.js';

/**
 * Single step in a {@link StorageAdapter.batch} call. Used to persist the mutation queue atomically.
 */
export type BatchOperation =
  | { type: 'put'; key: string; value: unknown }
  | { type: 'delete'; key: string };

/**
 * Pluggable persistence for query cache and sync queue. Built-in implementations are exported
 * from `react-offline-first/adapters`.
 */
export interface StorageAdapter {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  batch(ops: BatchOperation[]): Promise<void>;
}

export type RetryBackoff = 'linear' | 'exponential';

export type BuiltInConflictStrategy = 'client-wins' | 'server-wins' | 'last-write-wins' | 'manual';

export type ConflictStrategy =
  | BuiltInConflictStrategy
  | ((local: unknown, remote: unknown) => unknown | Promise<unknown>);

/** Function signature for programmatic conflict resolution (advanced / testing). */
export type ConflictResolver = (
  strategy: ConflictStrategy,
  local: unknown,
  remote: unknown
) => Promise<
  { outcome: 'use-local' | 'use-remote' | 'use-merged'; merged?: unknown } | { outcome: 'manual' }
>;

/**
 * Options for {@link OfflineProvider}. Controls IndexedDB namespace, sync polling, retries,
 * default conflict behavior, optional service worker URL, and sync callbacks.
 */
export interface OfflineConfig {
  /** IndexedDB database name segment used for cache and queue persistence. */
  storeName?: string;
  /** Background drain interval in ms when online. */
  syncInterval?: number;
  /** Max attempts per queued mutation before marking failed. */
  maxRetries?: number;
  retryBackoff?: RetryBackoff;
  /** Default strategy; override per mutation with `MutationOptions.conflictStrategy`. */
  conflictStrategy?: ConflictStrategy;
  /** Public URL of your service worker script (optional). */
  serviceWorker?: string;
  /** Fired after mutations successfully sync (per completed item). */
  onSyncSuccess?: (mutations: QueuedMutation[]) => void;
  /** Fired on sync failures (retries exhausted, SW registration, etc.). */
  onSyncError?: (error: unknown, mutation: QueuedMutation) => void;
  /** URL for connectivity ping (default HEAD /favicon.ico relative). */
  pingUrl?: string;
  pingTimeoutMs?: number;
  /** Debounce for navigator online/offline before confirming (default 500). */
  networkDebounceMs?: number;
}

export interface NetworkStatus {
  isOnline: boolean;
  since: Date | null;
}

export interface NetworkStatusChangeEvent {
  isOnline: boolean;
  confirmedAt: Date;
  method: 'navigator' | 'ping';
}

export interface QueuedMutation {
  id: string;
  key: string;
  input: unknown;
  attempt: number;
  maxRetries: number;
  createdAt: Date;
  lastAttemptAt: Date | null;
  status: 'pending' | 'syncing' | 'failed';
  error: string | null;
  idempotencyKey?: string;
}

/** Arguments for {@link useOfflineQuery}. */
export interface OfflineQueryOptions<T> {
  /** Stable cache key (namespaced by engine store). */
  key: string;
  /** Loads fresh data when online; skipped when offline (cache still shown). */
  fetcher: () => Promise<T>;
  /** After this many ms without successful fetch, data is considered stale. */
  staleTime?: number;
  /** Reserved for TTL eviction (persisted until overwritten today). */
  cacheTime?: number;
}

export type OfflineQueryStatus = 'loading' | 'success' | 'error' | 'stale';

/** Return value of {@link useOfflineQuery}. */
export interface OfflineQueryResult<T> {
  data: T | undefined;
  status: OfflineQueryStatus;
  isStale: boolean;
  lastSynced: Date | null;
  refetch: () => Promise<void>;
}

/** Arguments for {@link useMutation}. */
export interface MutationOptions<TInput, TOutput> {
  /** Namespace for queue + handler registration; use with {@link useMutation} `cancelAll`. */
  mutationKey: string;
  mutationFn: (input: TInput) => Promise<TOutput>;
  onMutate?: (input: TInput) => { optimisticData?: unknown } | void;
  onSuccess?: (data: TOutput, input: TInput) => void;
  onError?: (error: unknown, input: TInput) => void;
  onSettled?: () => void;
  conflictStrategy?: ConflictStrategy;
  idempotencyKey?: (input: TInput) => string | undefined;
  /** If mutationFn throws { conflict: true, remote }, resolver uses this. */
  isConflictError?: (error: unknown) => error is { conflict: true; remote: unknown };
}

export type MutationStatus = 'idle' | 'pending' | 'syncing' | 'error';

/** Return value of {@link useMutation}. */
export interface MutationResult<TInput> {
  mutate: (input: TInput) => void;
  status: MutationStatus;
  pendingCount: number;
  cancelAll: () => void;
}

/** Return value of {@link useQueue}. */
export interface QueueResult {
  queue: QueuedMutation[];
  retry: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

/** One unresolved conflict when strategy is `manual`. */
export interface ConflictRecord {
  id: string;
  local: unknown;
  remote: unknown;
  mutationId: string;
}

/** Return value of {@link useConflict}. */
export interface ConflictResult {
  conflicts: ConflictRecord[];
  resolve: (id: string, side: 'local' | 'remote') => void;
}

export type OfflineErrorCode =
  | 'STORAGE_UNAVAILABLE'
  | 'QUEUE_FULL'
  | 'MAX_RETRIES_EXCEEDED'
  | 'CONFLICT_UNRESOLVED'
  | 'SW_REGISTRATION_FAILED';

/**
 * Typed error for storage, queue, conflict, and service worker failures.
 * Surfaces via {@link OfflineConfig.onSyncError} and hook `status` / queue rows.
 */
export class OfflineError extends Error {
  override readonly name = 'OfflineError';

  constructor(
    public readonly code: OfflineErrorCode,
    message: string,
    public readonly mutation?: QueuedMutation
  ) {
    super(message);
  }
}

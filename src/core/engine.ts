import type {
  ConflictStrategy,
  ConflictRecord,
  OfflineConfig,
  QueuedMutation,
  StorageAdapter,
} from '../types/index.js';
import { OfflineError } from '../types/index.js';
import { MemoryAdapter, IndexedDBAdapter } from './storage-adapter.js';
import { NetworkMonitor } from './network-monitor.js';
import { SyncQueue, backoffMs } from './sync-queue.js';
import { resolveConflict } from './conflict-resolver.js';

export type MutationHandler = (input: unknown) => Promise<unknown>;

const DEFAULT_CONFIG: Required<
  Pick<
    OfflineConfig,
    'storeName' | 'syncInterval' | 'maxRetries' | 'retryBackoff' | 'conflictStrategy'
  >
> &
  Pick<OfflineConfig, 'pingUrl' | 'pingTimeoutMs'> = {
  storeName: 'react-offline-first',
  syncInterval: 30_000,
  maxRetries: 3,
  retryBackoff: 'exponential',
  conflictStrategy: 'client-wins',
  pingUrl: '/favicon.ico',
  pingTimeoutMs: 5000,
};

function mergeConfig(c?: OfflineConfig): OfflineConfig & typeof DEFAULT_CONFIG {
  return { ...DEFAULT_CONFIG, ...c };
}

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export class OfflineEngine {
  readonly network: NetworkMonitor;
  readonly storage: StorageAdapter;
  readonly queue: SyncQueue;
  private readonly config: OfflineConfig & typeof DEFAULT_CONFIG;
  private readonly handlers = new Map<string, MutationHandler>();
  private readonly listeners = new Set<() => void>();
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private draining = false;
  private conflicts: ConflictRecord[] = [];

  constructor(config?: OfflineConfig, isSSR = false) {
    this.config = mergeConfig(config);
    this.network = new NetworkMonitor({
      isSSR,
      pingUrl: this.config.pingUrl,
      pingTimeoutMs: this.config.pingTimeoutMs,
      debounceMs: config?.networkDebounceMs ?? 500,
    });
    this.storage =
      isSSR || typeof indexedDB === 'undefined'
        ? new MemoryAdapter()
        : new IndexedDBAdapter(this.config.storeName);
    this.queue = new SyncQueue(this.storage, this.config.storeName);
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  async init(): Promise<void> {
    await this.queue.hydrate();
    this.network.start();
    this.network.subscribe((ev) => {
      this.emit();
      if (ev.isOnline) void this.drain();
    });
    if (this.network.getStatus().isOnline) void this.drain();
    this.syncTimer = setInterval(() => {
      if (this.network.getStatus().isOnline) void this.drain();
    }, this.config.syncInterval);

    if (
      this.config.serviceWorker &&
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      try {
        await navigator.serviceWorker.register(this.config.serviceWorker);
        navigator.serviceWorker.ready.then(() => this.registerBackgroundSync()).catch(() => {});
      } catch (e) {
        const err = new OfflineError('SW_REGISTRATION_FAILED', String(e));
        const first = this.queue.list()[0];
        if (first) this.config.onSyncError?.(err, first);
      }
    }
  }

  private async registerBackgroundSync(): Promise<void> {
    const reg = await navigator.serviceWorker.ready;
    if (
      'sync' in reg &&
      typeof (
        reg as ServiceWorkerRegistration & { sync: { register: (t: string) => Promise<void> } }
      ).sync?.register === 'function'
    ) {
      try {
        await (
          reg as ServiceWorkerRegistration & { sync: { register: (t: string) => Promise<void> } }
        ).sync.register('offline-first-sync');
      } catch {
        /* Background Sync unsupported or denied */
      }
    }
  }

  destroy(): void {
    this.network.stop();
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = null;
  }

  getMaxRetries(): number {
    return this.config.maxRetries;
  }

  registerMutation(key: string, handler: MutationHandler): () => void {
    this.handlers.set(key, handler);
    return () => this.handlers.delete(key);
  }

  getConflicts(): ConflictRecord[] {
    return [...this.conflicts];
  }

  resolveConflict(id: string, side: 'local' | 'remote'): void {
    const idx = this.conflicts.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const c = this.conflicts[idx]!;
    this.conflicts.splice(idx, 1);
    const item = this.queue.findById(c.mutationId);
    if (!item) {
      this.emit();
      return;
    }
    if (side === 'remote') {
      void this.queue.remove(c.mutationId);
    } else {
      void this.queue.update(c.mutationId, { status: 'pending', error: null });
      void this.drain();
    }
    this.emit();
  }

  strategyForMutationKey(_mutationKey: string, override?: ConflictStrategy): ConflictStrategy {
    return override ?? this.config.conflictStrategy;
  }

  async cacheGet<T>(key: string): Promise<T | undefined> {
    return this.storage.get<T>(`${this.config.storeName}:q:${key}`);
  }

  async cacheSet<T>(key: string, value: T, cacheTimeMs: number): Promise<void> {
    void cacheTimeMs; /* reserved for TTL eviction */
    await this.storage.set(`${this.config.storeName}:q:${key}`, value);
  }

  async enqueueMutation(params: {
    mutationKey: string;
    input: unknown;
    maxRetries: number;
    strategy: ConflictStrategy;
    idempotencyKey?: string;
  }): Promise<QueuedMutation> {
    const id = randomId();
    const row = await this.queue.enqueue({
      id,
      key: params.mutationKey,
      input: params.input,
      maxRetries: params.maxRetries,
      createdAt: new Date(),
      status: 'pending',
      idempotencyKey: params.idempotencyKey,
    });

    const h = this.handlers.get(params.mutationKey);
    if (this.network.getStatus().isOnline && h) {
      void this.runOne(row.id, h, params.strategy);
    }
    this.emit();
    return row;
  }

  async drain(): Promise<void> {
    if (this.draining || !this.network.getStatus().isOnline) return;
    this.draining = true;
    try {
      for (;;) {
        const pending = this.queue
          .list()
          .filter((m) => m.status === 'pending' && this.handlers.has(m.key));
        if (pending.length === 0) break;
        pending.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const next = pending[0]!;
        await this.runOne(
          next.id,
          this.handlers.get(next.key)!,
          this.strategyForMutationKey(next.key)
        );
      }
    } finally {
      this.draining = false;
    }
  }

  private async runOne(
    id: string,
    execute: (input: unknown) => Promise<unknown>,
    strategy: ConflictStrategy
  ): Promise<void> {
    const item = this.queue.findById(id);
    if (!item || item.status !== 'pending') return;

    await this.queue.update(id, { status: 'syncing', lastAttemptAt: new Date(), error: null });

    try {
      await execute(item.input);
      const done = { ...item, status: 'syncing' as const };
      await this.queue.remove(id);
      this.config.onSyncSuccess?.([done]);
      this.emit();
    } catch (err) {
      const conflictRemote =
        err &&
        typeof err === 'object' &&
        'conflict' in err &&
        (err as { conflict?: boolean }).conflict
          ? (err as { remote?: unknown }).remote
          : undefined;

      if (conflictRemote !== undefined) {
        const resolved = await resolveConflict(strategy, item.input, conflictRemote);
        if (resolved.outcome === 'manual') {
          const cid = randomId();
          this.conflicts.push({
            id: cid,
            local: item.input,
            remote: conflictRemote,
            mutationId: id,
          });
          await this.queue.update(id, {
            status: 'pending',
            error: 'CONFLICT_UNRESOLVED',
          });
          this.config.onSyncError?.(
            new OfflineError('CONFLICT_UNRESOLVED', 'Unresolved conflict', item),
            item
          );
          this.emit();
          return;
        }
        if (resolved.outcome === 'use-remote') {
          await this.queue.remove(id);
          this.emit();
          return;
        }
        const nextInput =
          resolved.outcome === 'use-merged' && resolved.merged !== undefined
            ? resolved.merged
            : item.input;
        await this.queue.update(id, { input: nextInput, status: 'pending' });
        void this.drain();
        this.emit();
        return;
      }

      const attempt = item.attempt + 1;
      if (attempt >= item.maxRetries) {
        await this.queue.update(id, {
          attempt,
          status: 'failed',
          error: String(err),
        });
        this.config.onSyncError?.(
          new OfflineError('MAX_RETRIES_EXCEEDED', String(err), {
            ...item,
            attempt,
            status: 'failed',
            error: String(err),
          }),
          item
        );
        this.emit();
        return;
      }

      const delay = backoffMs(attempt, this.config.retryBackoff);
      await this.queue.update(id, {
        attempt,
        status: 'pending',
        error: String(err),
      });
      setTimeout(() => void this.drain(), delay);
      this.emit();
    }
  }

  retry(id: string): void {
    const m = this.queue.findById(id);
    if (!m) return;
    void this.queue.update(id, { status: 'pending', error: null, attempt: 0 });
    void this.drain();
    this.emit();
  }

  remove(id: string): void {
    void this.queue.remove(id);
    this.emit();
  }

  async clearQueue(): Promise<void> {
    await this.queue.clear();
    this.emit();
  }

  cancelAllForKey(mutationKey: string): void {
    void this.queue.cancelAllForKey(mutationKey);
    this.emit();
  }

  pendingCountForKey(mutationKey: string): number {
    return this.queue.pendingCountForKey(mutationKey);
  }
}

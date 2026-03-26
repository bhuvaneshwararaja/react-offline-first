import type { QueuedMutation, RetryBackoff, StorageAdapter } from '../types/index.js';

const QUEUE_KEY = '__rof_queue__';

type Serialized = Omit<QueuedMutation, 'createdAt' | 'lastAttemptAt'> & {
  createdAt: string;
  lastAttemptAt: string | null;
};

function serialize(m: QueuedMutation): Serialized {
  return {
    ...m,
    createdAt: m.createdAt.toISOString(),
    lastAttemptAt: m.lastAttemptAt?.toISOString() ?? null,
  };
}

function deserialize(s: Serialized): QueuedMutation {
  return {
    ...s,
    createdAt: new Date(s.createdAt),
    lastAttemptAt: s.lastAttemptAt ? new Date(s.lastAttemptAt) : null,
  };
}

export function backoffMs(attempt: number, kind: RetryBackoff): number {
  const base = 1000;
  if (kind === 'linear') return base * (attempt + 1);
  return Math.min(base * 2 ** attempt, 60_000);
}

export class SyncQueue {
  private items: QueuedMutation[] = [];

  constructor(
    private readonly storage: StorageAdapter,
    private readonly storePrefix: string
  ) {}

  private queueStorageKey(): string {
    return `${this.storePrefix}:${QUEUE_KEY}`;
  }

  async hydrate(): Promise<void> {
    const raw = await this.storage.get<Serialized[]>(this.queueStorageKey());
    if (!raw || !Array.isArray(raw)) {
      this.items = [];
      return;
    }
    this.items = raw.map(deserialize);
  }

  private async persist(): Promise<void> {
    const serialized = this.items.map(serialize);
    await this.storage.set(this.queueStorageKey(), serialized);
  }

  list(): QueuedMutation[] {
    return [...this.items];
  }

  findById(id: string): QueuedMutation | undefined {
    return this.items.find((m) => m.id === id);
  }

  /**
   * Enqueue respecting idempotency: same idempotencyKey replaces pending duplicate for same mutation key.
   */
  async enqueue(
    entry: Omit<QueuedMutation, 'attempt' | 'lastAttemptAt' | 'error'> & { attempt?: number }
  ): Promise<QueuedMutation> {
    if (entry.idempotencyKey) {
      const idx = this.items.findIndex(
        (m) =>
          m.key === entry.key &&
          m.idempotencyKey === entry.idempotencyKey &&
          (m.status === 'pending' || m.status === 'syncing')
      );
      if (idx >= 0) {
        const existing = this.items[idx]!;
        const updated: QueuedMutation = {
          ...existing,
          input: entry.input,
          status: 'pending',
          error: null,
        };
        this.items[idx] = updated;
        await this.persist();
        return updated;
      }
    }

    const row: QueuedMutation = {
      ...entry,
      attempt: entry.attempt ?? 0,
      lastAttemptAt: null,
      error: null,
    };
    this.items.push(row);
    await this.persist();
    return row;
  }

  async remove(id: string): Promise<void> {
    this.items = this.items.filter((m) => m.id !== id);
    await this.persist();
  }

  async update(id: string, patch: Partial<QueuedMutation>): Promise<void> {
    const i = this.items.findIndex((m) => m.id === id);
    if (i < 0) return;
    this.items[i] = { ...this.items[i]!, ...patch };
    await this.persist();
  }

  async clear(): Promise<void> {
    this.items = [];
    await this.persist();
  }

  /** Next item to process: oldest `pending` by createdAt (FIFO across namespaces). */
  nextPending(): QueuedMutation | undefined {
    const pending = this.items.filter((m) => m.status === 'pending');
    if (pending.length === 0) return undefined;
    return pending.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));
  }

  /** Pending count for a mutation key. */
  pendingCountForKey(mutationKey: string): number {
    return this.items.filter((m) => m.key === mutationKey && m.status === 'pending').length;
  }

  async cancelAllForKey(mutationKey: string): Promise<void> {
    this.items = this.items.filter((m) => !(m.key === mutationKey && m.status === 'pending'));
    await this.persist();
  }
}

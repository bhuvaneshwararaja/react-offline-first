import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryAdapter } from '../../src/core/storage-adapter.js';
import { SyncQueue, backoffMs } from '../../src/core/sync-queue.js';
import type { QueuedMutation } from '../../src/types/index.js';

type EnqueueInput = Parameters<SyncQueue['enqueue']>[0];

function baseRow(
  partial: Partial<Omit<QueuedMutation, 'attempt' | 'lastAttemptAt' | 'error'>> &
    Pick<QueuedMutation, 'id' | 'key' | 'input'>
): EnqueueInput {
  return {
    maxRetries: 3,
    createdAt: new Date(),
    status: 'pending',
    ...partial,
  };
}

describe('backoffMs', () => {
  it('linear and exponential', () => {
    expect(backoffMs(0, 'linear')).toBe(1000);
    expect(backoffMs(1, 'linear')).toBe(2000);
    expect(backoffMs(0, 'exponential')).toBe(1000);
    expect(backoffMs(2, 'exponential')).toBe(4000);
  });
});

describe('SyncQueue', () => {
  let storage: MemoryAdapter;
  let q: SyncQueue;

  beforeEach(() => {
    storage = new MemoryAdapter();
    q = new SyncQueue(storage, 'app');
  });

  it('hydrate empty', async () => {
    await q.hydrate();
    expect(q.list()).toEqual([]);
  });

  it('FIFO pending by createdAt', async () => {
    const t0 = new Date(0);
    const t1 = new Date(1);
    await q.enqueue(baseRow({ id: 'a', key: 'k', input: 1, createdAt: t1, status: 'pending' }));
    await q.enqueue(baseRow({ id: 'b', key: 'k', input: 2, createdAt: t0, status: 'pending' }));
    const next = q.nextPending();
    expect(next?.id).toBe('b');
  });

  it('idempotency replaces pending', async () => {
    await q.enqueue(
      baseRow({
        id: 'a',
        key: 'k',
        input: 1,
        idempotencyKey: 'idem',
        status: 'pending',
      })
    );
    await q.enqueue(
      baseRow({
        id: 'b',
        key: 'k',
        input: 2,
        idempotencyKey: 'idem',
        status: 'pending',
      })
    );
    expect(q.list()).toHaveLength(1);
    expect(q.list()[0]!.input).toBe(2);
  });

  it('cancelAllForKey', async () => {
    await q.enqueue(baseRow({ id: 'a', key: 'x', input: 1, status: 'pending' }));
    await q.enqueue(baseRow({ id: 'b', key: 'y', input: 2, status: 'pending' }));
    await q.cancelAllForKey('x');
    expect(q.list().map((m) => m.id)).toEqual(['b']);
  });
});

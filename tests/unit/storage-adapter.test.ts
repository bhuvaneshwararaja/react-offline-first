import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryAdapter, LocalStorageAdapter } from '../../src/core/storage-adapter.js';

describe('MemoryAdapter', () => {
  let a: MemoryAdapter;

  beforeEach(() => {
    a = new MemoryAdapter();
  });

  it('get/set/delete/clear/keys', async () => {
    expect(await a.get('x')).toBeUndefined();
    await a.set('x', 1);
    expect(await a.get<number>('x')).toBe(1);
    expect(await a.keys()).toContain('x');
    await a.delete('x');
    expect(await a.get('x')).toBeUndefined();
    await a.set('a', 1);
    await a.set('b', 2);
    await a.clear();
    expect(await a.keys()).toEqual([]);
  });

  it('batch', async () => {
    await a.batch([
      { type: 'put', key: 'a', value: 1 },
      { type: 'put', key: 'b', value: 2 },
      { type: 'delete', key: 'a' },
    ]);
    expect(await a.get('a')).toBeUndefined();
    expect(await a.get('b')).toBe(2);
  });
});

describe('LocalStorageAdapter', () => {
  it('batch is sequential', async () => {
    if (typeof localStorage === 'undefined') return;
    const a = new LocalStorageAdapter('test-rof-');
    await a.clear();
    await a.batch([
      { type: 'put', key: 'k', value: { n: 1 } },
      { type: 'put', key: 'k', value: { n: 2 } },
    ]);
    expect(await a.get<{ n: number }>('k')).toEqual({ n: 2 });
    await a.clear();
  });
});

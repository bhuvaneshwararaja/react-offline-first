import { describe, it, expect } from 'vitest';
import { resolveConflict } from '../../src/core/conflict-resolver.js';

describe('resolveConflict', () => {
  it('client-wins', async () => {
    const r = await resolveConflict('client-wins', { x: 1 }, { x: 2 });
    expect(r).toEqual({ outcome: 'use-local' });
  });

  it('server-wins', async () => {
    const r = await resolveConflict('server-wins', { x: 1 }, { x: 2 });
    expect(r).toEqual({ outcome: 'use-remote' });
  });

  it('manual', async () => {
    const r = await resolveConflict('manual', { x: 1 }, { x: 2 });
    expect(r).toEqual({ outcome: 'manual' });
  });

  it('last-write-wins by updatedAt', async () => {
    const r = await resolveConflict(
      'last-write-wins',
      { id: 1, updatedAt: 100 },
      { id: 1, updatedAt: 200 }
    );
    expect(r).toEqual({ outcome: 'use-remote' });
    const r2 = await resolveConflict(
      'last-write-wins',
      { id: 1, updatedAt: 300 },
      { id: 1, updatedAt: 200 }
    );
    expect(r2).toEqual({ outcome: 'use-local' });
  });

  it('custom resolver', async () => {
    const r = await resolveConflict((a, b) => ({ merged: a, b }), { a: 1 }, { b: 2 });
    expect(r.outcome).toBe('use-merged');
    if (r.outcome === 'use-merged') {
      expect(r.merged).toEqual({ merged: { a: 1 }, b: { b: 2 } });
    }
  });
});

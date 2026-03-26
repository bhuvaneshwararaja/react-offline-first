import type { ConflictStrategy } from '../types/index.js';

function ts(v: unknown): number | null {
  if (v && typeof v === 'object' && 'updatedAt' in v) {
    const u = (v as { updatedAt?: unknown }).updatedAt;
    if (typeof u === 'number') return u;
    if (u instanceof Date) return u.getTime();
    if (typeof u === 'string') {
      const t = Date.parse(u);
      return Number.isNaN(t) ? null : t;
    }
  }
  return null;
}

export async function resolveConflict(
  strategy: ConflictStrategy,
  local: unknown,
  remote: unknown
): Promise<
  { outcome: 'use-local' | 'use-remote' | 'use-merged'; merged?: unknown } | { outcome: 'manual' }
> {
  if (typeof strategy === 'function') {
    const merged = await strategy(local, remote);
    return { outcome: 'use-merged', merged };
  }
  switch (strategy) {
    case 'client-wins':
      return { outcome: 'use-local' };
    case 'server-wins':
      return { outcome: 'use-remote' };
    case 'last-write-wins': {
      const lt = ts(local);
      const rt = ts(remote);
      if (lt == null || rt == null) return { outcome: 'use-remote' };
      return lt > rt ? { outcome: 'use-local' } : { outcome: 'use-remote' };
    }
    case 'manual':
      return { outcome: 'manual' };
    default:
      return { outcome: 'use-local' };
  }
}

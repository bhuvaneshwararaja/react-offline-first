import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NetworkMonitor } from '../../src/core/network-monitor.js';

describe('NetworkMonitor', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('SSR reports online', () => {
    const m = new NetworkMonitor({ isSSR: true });
    expect(m.getStatus().isOnline).toBe(true);
    m.start();
    m.stop();
  });

  it('ping uses fetch', async () => {
    const m = new NetworkMonitor({
      pingUrl: 'https://example.com/ping',
      pingTimeoutMs: 1000,
      debounceMs: 0,
    });
    m.start();
    const ok = await m.ping();
    expect(ok).toBe(true);
    expect(fetch).toHaveBeenCalled();
    m.stop();
  });
});

import type { NetworkStatusChangeEvent } from '../types/index.js';

export type NetworkListener = (ev: NetworkStatusChangeEvent) => void;

export interface NetworkMonitorOptions {
  pingUrl?: string;
  pingTimeoutMs?: number;
  debounceMs?: number;
  /** SSR: no window */
  isSSR?: boolean;
}

const DEFAULT_DEBOUNCE = 500;
const DEFAULT_PING_TIMEOUT = 5000;

export class NetworkMonitor {
  private isOnline = true;
  private since: Date | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingOnline: boolean | null = null;
  private readonly listeners = new Set<NetworkListener>();
  private readonly boundOnline: () => void;
  private readonly boundOffline: () => void;

  constructor(private readonly options: NetworkMonitorOptions = {}) {
    if (options.isSSR) {
      this.isOnline = true;
      this.since = null;
      this.boundOnline = () => {};
      this.boundOffline = () => {};
      return;
    }
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.since = typeof navigator !== 'undefined' ? new Date() : null;
    this.boundOnline = () => this.scheduleConfirm(true, 'navigator');
    this.boundOffline = () => this.scheduleConfirm(false, 'navigator');
  }

  getStatus(): { isOnline: boolean; since: Date | null } {
    return { isOnline: this.isOnline, since: this.since };
  }

  subscribe(fn: NetworkListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  start(): void {
    if (this.options.isSSR || typeof window === 'undefined') return;
    window.addEventListener('online', this.boundOnline);
    window.addEventListener('offline', this.boundOffline);
  }

  stop(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('online', this.boundOnline);
    window.removeEventListener('offline', this.boundOffline);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
  }

  private scheduleConfirm(next: boolean, method: 'navigator' | 'ping'): void {
    this.pendingOnline = next;
    const debounce = this.options.debounceMs ?? DEFAULT_DEBOUNCE;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => void this.flushPending(method), debounce);
  }

  private async flushPending(method: 'navigator' | 'ping'): Promise<void> {
    this.debounceTimer = null;
    const next = this.pendingOnline;
    this.pendingOnline = null;
    if (next === null) return;

    let confirmed = next;
    let confirmMethod = method;

    if (next === true && typeof fetch !== 'undefined') {
      const url = this.options.pingUrl ?? '/favicon.ico';
      const timeout = this.options.pingTimeoutMs ?? DEFAULT_PING_TIMEOUT;
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeout);
      try {
        await fetch(url, { method: 'HEAD', signal: ac.signal, cache: 'no-store' });
        confirmed = true;
        confirmMethod = 'ping';
      } catch {
        confirmed = false;
        confirmMethod = 'ping';
      } finally {
        clearTimeout(t);
      }
    }

    if (confirmed === this.isOnline) return;
    this.isOnline = confirmed;
    this.since = new Date();
    const ev: NetworkStatusChangeEvent = {
      isOnline: confirmed,
      confirmedAt: this.since,
      method: confirmMethod,
    };
    for (const fn of this.listeners) fn(ev);
  }

  /** Force connectivity check (HEAD ping). */
  async ping(): Promise<boolean> {
    if (this.options.isSSR || typeof fetch === 'undefined') return true;
    const url = this.options.pingUrl ?? '/favicon.ico';
    const timeout = this.options.pingTimeoutMs ?? DEFAULT_PING_TIMEOUT;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeout);
    try {
      await fetch(url, { method: 'HEAD', signal: ac.signal, cache: 'no-store' });
      this.applyImmediate(true, 'ping');
      return true;
    } catch {
      this.applyImmediate(false, 'ping');
      return false;
    } finally {
      clearTimeout(t);
    }
  }

  private applyImmediate(isOnline: boolean, method: 'navigator' | 'ping'): void {
    if (isOnline === this.isOnline) return;
    this.isOnline = isOnline;
    this.since = new Date();
    const ev: NetworkStatusChangeEvent = {
      isOnline,
      confirmedAt: this.since,
      method,
    };
    for (const fn of this.listeners) fn(ev);
  }
}

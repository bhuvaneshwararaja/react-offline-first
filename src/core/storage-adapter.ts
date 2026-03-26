import type { BatchOperation, StorageAdapter } from '../types/index.js';

/** In-memory adapter for tests and SSR fallback. */
export class MemoryAdapter implements StorageAdapter {
  private readonly map: Map<string, unknown>;

  constructor(seed?: Map<string, unknown>) {
    this.map = seed ?? new Map();
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.map.get(key) as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.map.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  async clear(): Promise<void> {
    this.map.clear();
  }

  async keys(): Promise<string[]> {
    return [...this.map.keys()];
  }

  async batch(ops: BatchOperation[]): Promise<void> {
    for (const op of ops) {
      if (op.type === 'put') this.map.set(op.key, op.value);
      else this.map.delete(op.key);
    }
  }
}

function req(storeName: string): IDBOpenDBRequest {
  return indexedDB.open(storeName, 1);
}

function promisifyTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IDB transaction aborted'));
  });
}

/** Native IndexedDB adapter (zero dependencies). */
export class IndexedDBAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;
  private readonly store = 'kv';
  private openPromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly dbName: string) {}

  private open(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);
    if (this.openPromise) return this.openPromise;
    this.openPromise = new Promise((resolve, reject) => {
      const r = req(this.dbName);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(this.store)) {
          db.createObjectStore(this.store);
        }
      };
      r.onerror = () => reject(r.error ?? new Error('IndexedDB open failed'));
      r.onsuccess = () => {
        this.db = r.result;
        resolve(this.db);
      };
    });
    return this.openPromise;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.store, 'readonly');
      const os = tx.objectStore(this.store);
      const g = os.get(key);
      g.onerror = () => reject(g.error);
      g.onsuccess = () => resolve(g.result as T | undefined);
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.store, 'readwrite');
      tx.objectStore(this.store).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async delete(key: string): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.store, 'readwrite');
      tx.objectStore(this.store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.store, 'readwrite');
      tx.objectStore(this.store).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async keys(): Promise<string[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.store, 'readonly');
      const os = tx.objectStore(this.store);
      const r = os.getAllKeys();
      r.onerror = () => reject(r.error);
      r.onsuccess = () => resolve((r.result as IDBValidKey[]).map(String));
    });
  }

  async batch(ops: BatchOperation[]): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(this.store, 'readwrite');
    const os = tx.objectStore(this.store);
    for (const op of ops) {
      if (op.type === 'put') os.put(op.value, op.key);
      else os.delete(op.key);
    }
    await promisifyTransaction(tx);
  }
}

/**
 * localStorage-backed adapter. `batch` runs operations sequentially (not atomic).
 */
export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly prefix = 'rof:') {}

  private k(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (typeof localStorage === 'undefined') return undefined;
    const raw = localStorage.getItem(this.k(key));
    if (raw == null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.k(key), JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.k(key));
  }

  async clear(): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    const p = this.prefix;
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(p)) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
  }

  async keys(): Promise<string[]> {
    if (typeof localStorage === 'undefined') return [];
    const p = this.prefix;
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const full = localStorage.key(i);
      if (full?.startsWith(p)) out.push(full.slice(p.length));
    }
    return out;
  }

  async batch(ops: BatchOperation[]): Promise<void> {
    for (const op of ops) {
      if (op.type === 'put') await this.set(op.key, op.value);
      else await this.delete(op.key);
    }
  }
}

/**
 * Lightweight TTL in-memory cache.
 *
 * Used by providers to avoid redundant API calls for the same query
 * within a short window (e.g. hot-reloading, tab revisits).
 *
 * Not persisted — clears on page refresh.
 */

interface CacheEntry<T> {
  data: T;
  expires: number; // Unix ms
}

class TTLCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /** Retrieve a cached value, or null if missing / expired. */
  get<T>(key: string): T | null {
    let entry = this.store.get(key);
    if (!entry) {
      try {
        const raw = localStorage.getItem(`pexelnest.cache.${key}`);
        if (raw) {
          entry = JSON.parse(raw) as CacheEntry<unknown>;
        }
      } catch {
        /* ignore */
      }
    }
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.delete(key);
      return null;
    }
    if (!this.store.has(key)) {
      this.store.set(key, entry);
    }
    return entry.data as T;
  }

  /** Store a value with a TTL in seconds. */
  set<T>(key: string, data: T, ttlSeconds = 120, persist = true): void {
    const entry = { data, expires: Date.now() + ttlSeconds * 1000 };
    this.store.set(key, entry);
    if (persist) {
      try {
        localStorage.setItem(`pexelnest.cache.${key}`, JSON.stringify(entry));
      } catch {
        /* ignore */
      }
    }
  }

  /** Remove a specific key. */
  delete(key: string): void {
    this.store.delete(key);
    try {
      localStorage.removeItem(`pexelnest.cache.${key}`);
    } catch {
      /* ignore */
    }
  }

  /** Clear all cached entries. */
  clear(): void {
    this.store.clear();
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("pexelnest.cache.")) localStorage.removeItem(k);
      });
    } catch {
      /* ignore */
    }
  }

  /** How many entries are currently cached. */
  get size(): number {
    return this.store.size;
  }
}

/** Global shared cache instance. */
export const cache = new TTLCache();

/**
 * Build a deterministic cache key from any object.
 * Sorts keys so { a:1, b:2 } and { b:2, a:1 } produce the same key.
 */
export function cacheKey(prefix: string, params: Record<string, unknown>): string {
  const sorted = Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  return `${prefix}:${JSON.stringify(sorted)}`;
}

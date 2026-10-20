import type { CacheProvider } from "@/application/ports/CacheProvider";

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

/**
 * In-memory cache adapter backed by a simple `Map`.
 *
 * Good enough for local dev and single-process deployments.
 * In production (serverless) swap this for a Redis or Vercel KV adapter
 * by implementing the same `CacheProvider` port.
 */
export class InMemoryCache implements CacheProvider {
  private readonly store = new Map<string, CacheEntry>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      data: value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
}

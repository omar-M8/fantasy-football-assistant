/**
 * Cache port — application-layer abstraction for key/value caching with TTL.
 *
 * All methods are async so adapters backed by Redis, Vercel KV,
 * `unstable_cache`, or any other async store can implement it directly.
 */
export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}

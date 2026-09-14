/**
 * ISR Cache — Incremental Static Regeneration for Typepress.
 *
 * Uses Redis for cache storage with configurable TTL per content type.
 * Supports stale-while-revalidate pattern for optimal performance.
 *
 * Cache keys: content:{id}, content:slug:{slug}, content:list:{type}:{page}
 */
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');

const DEFAULT_TTL = 60; // 60 seconds
const STALE_TTL = 300; // 5 minutes (serve stale while revalidating)

interface CacheEntry<T> {
  data: T;
  cached_at: number;
  stale_at: number;
}

export class ISRCache {
  /**
   * Get cached data or fetch fresh data.
   * Implements stale-while-revalidate pattern.
   */
  async get_or_fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl = DEFAULT_TTL,
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached) {
      const now = Date.now();

      // Data is fresh — return it
      if (now < cached.stale_at) {
        return cached.data;
      }

      // Data is stale but usable — return stale data, trigger background revalidation
      this.revalidate(key, fetcher, ttl);
      return cached.data;
    }

    // No cache — fetch fresh data
    const data = await fetcher();
    await this.set(key, data, ttl);
    return data;
  }

  /** Get data from cache */
  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const raw = await redis.get(`isr:${key}`);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as CacheEntry<T>;
    } catch {
      return null;
    }
  }

  /** Set data in cache with TTL */
  async set<T>(key: string, data: T, ttl = DEFAULT_TTL): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      cached_at: Date.now(),
      stale_at: Date.now() + STALE_TTL * 1000,
    };

    await redis.setex(`isr:${key}`, ttl, JSON.stringify(entry));
  }

  /** Invalidate a specific cache key */
  async invalidate(key: string): Promise<void> {
    await redis.del(`isr:${key}`);
  }

  /** Invalidate all cache keys matching a pattern */
  async invalidate_pattern(pattern: string): Promise<void> {
    const keys = await redis.keys(`isr:${pattern}`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  /** Background revalidation (fire and forget) */
  private revalidate<T>(key: string, fetcher: () => Promise<T>, ttl: number): void {
    fetcher()
      .then((data) => this.set(key, data, ttl))
      .catch((err) => console.error(`[ISR] Revalidation failed for ${key}:`, err));
  }
}

export const isr_cache = new ISRCache();

/**
 * Session Store — Redis-backed session storage for @fastify/session.
 *
 * Provides a production-safe session store using ioredis. The store implements
 * the @fastify/session SessionStore interface (get/set/destroy callbacks).
 *
 * TTL is derived from the session cookie max age to keep Redis entries aligned
 * with cookie expiry. A key prefix prevents collisions with other Redis data.
 */
import Redis from 'ioredis';
import type { Session } from 'fastify';

type Callback = (err?: unknown) => void;
type CallbackSession = (err: unknown, result?: Session | null) => void;

const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

function get_session_ttl_seconds(session: Session): number {
  const cookie = (session as Session & { cookie?: { originalMaxAge?: number | null; maxAge?: number | null } }).cookie;
  const max_age_ms = cookie?.originalMaxAge ?? cookie?.maxAge;
  if (typeof max_age_ms === 'number' && Number.isFinite(max_age_ms) && max_age_ms > 0) {
    return Math.max(1, Math.ceil(max_age_ms / 1000));
  }
  return DEFAULT_TTL_SECONDS;
}

export interface SessionStore {
  set(session_id: string, session: Session, callback: Callback): void;
  get(session_id: string, callback: CallbackSession): void;
  destroy(session_id: string, callback: Callback): void;
  /** Destroy all sessions belonging to a user. Returns number of sessions removed. */
  destroy_by_user_id(user_id: string): Promise<number>;
}

export class RedisSessionStore implements SessionStore {
  private readonly redis: Redis;
  private readonly prefix: string;

  constructor(redis: Redis, prefix = 'tp:sess:') {
    this.redis = redis;
    this.prefix = prefix;
  }

  private key(session_id: string): string {
    return `${this.prefix}${session_id}`;
  }

  set(session_id: string, session: Session, callback: Callback): void {
    const ttl_seconds = get_session_ttl_seconds(session);
    this.redis
      .set(this.key(session_id), JSON.stringify(session), 'EX', ttl_seconds)
      .then(() => callback())
      .catch((error) => callback(error));
  }

  get(session_id: string, callback: CallbackSession): void {
    this.redis
      .get(this.key(session_id))
      .then((raw) => {
        if (!raw) {
          callback(null, null);
          return;
        }

        try {
          callback(null, JSON.parse(raw) as Session);
        } catch (error) {
          callback(error);
        }
      })
      .catch((error) => callback(error));
  }

  destroy(session_id: string, callback: Callback): void {
    this.redis
      .del(this.key(session_id))
      .then(() => callback())
      .catch((error) => callback(error));
  }

  /** Scan and delete all Redis sessions owned by the given user. */
  async destroy_by_user_id(user_id: string): Promise<number> {
    let cursor = '0';
    let deleted = 0;
    const match = `${this.prefix}*`;

    do {
      const [next_cursor, keys] = await this.redis.scan(cursor, 'MATCH', match, 'COUNT', 100);
      cursor = next_cursor;
      if (keys.length === 0) continue;

      const values = await this.redis.mget(...keys);
      const keys_to_delete: string[] = [];

      for (let i = 0; i < keys.length; i++) {
        const raw = values[i];
        const key = keys[i];
        if (!raw || !key) continue;

        try {
          const parsed = JSON.parse(raw) as { user_id?: unknown };
          if (parsed.user_id === user_id) {
            keys_to_delete.push(key);
          }
        } catch {
          // Ignore malformed session entries; they expire naturally via TTL.
        }
      }

      if (keys_to_delete.length > 0) {
        deleted += await this.redis.del(...keys_to_delete);
      }
    } while (cursor !== '0');

    return deleted;
  }

  async close(): Promise<void> {
    // Only quit clients we own/manage; callers decide lifecycle.
    if (this.redis.status === 'end') return;
    await this.redis.quit();
  }
}

export class MemorySessionStore implements SessionStore {
  private readonly store = new Map<string, Session>();

  set(session_id: string, session: Session, callback: Callback): void {
    this.store.set(session_id, session);
    callback();
  }

  get(session_id: string, callback: CallbackSession): void {
    callback(null, this.store.get(session_id) ?? null);
  }

  destroy(session_id: string, callback: Callback): void {
    this.store.delete(session_id);
    callback();
  }

  /** Remove all in-memory sessions owned by the given user. */
  async destroy_by_user_id(user_id: string): Promise<number> {
    let deleted = 0;
    for (const [session_id, session] of this.store.entries()) {
      const session_user_id = (session as Session & { user_id?: unknown }).user_id;
      if (session_user_id === user_id) {
        this.store.delete(session_id);
        deleted++;
      }
    }
    return deleted;
  }
}

export interface RedisSessionStoreOptions {
  url: string;
  prefix?: string;
  connect_timeout_ms?: number;
}

export async function create_redis_session_store(options: RedisSessionStoreOptions): Promise<{
  store: RedisSessionStore;
  redis: Redis;
}> {
  const redis = new Redis(options.url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: options.connect_timeout_ms ?? 5000,
  });

  try {
    await redis.connect();
    await redis.ping();
  } catch (error) {
    redis.disconnect();
    throw error;
  }

  return {
    store: new RedisSessionStore(redis, options.prefix),
    redis,
  };
}

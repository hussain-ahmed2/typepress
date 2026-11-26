import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session } from 'fastify';
import type Redis from 'ioredis';

interface RedisMockInstance {
  set: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  mget: ReturnType<typeof vi.fn>;
  scan: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  ping: ReturnType<typeof vi.fn>;
  quit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  status: string;
}

const redis_instance: RedisMockInstance = {
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  mget: vi.fn(),
  scan: vi.fn(),
  connect: vi.fn(),
  ping: vi.fn(),
  quit: vi.fn(),
  disconnect: vi.fn(),
  status: 'ready',
};

vi.mock('ioredis', () => ({
  default: vi.fn(() => redis_instance),
}));

import RedisClient from 'ioredis';
import { create_redis_session_store, MemorySessionStore, RedisSessionStore } from './session_store';

function create_session(user_id: string): Session {
  return { cookie: { originalMaxAge: 60000 }, user_id } as unknown as Session;
}

describe('RedisSessionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redis_instance.status = 'ready';
    redis_instance.set.mockResolvedValue('OK');
    redis_instance.get.mockResolvedValue(null);
    redis_instance.del.mockResolvedValue(1);
    redis_instance.mget.mockResolvedValue([]);
    redis_instance.scan.mockResolvedValue(['0', []]);
  });

  it('stores sessions with TTL derived from cookie max age', async () => {
    const store = new RedisSessionStore(redis_instance as unknown as Redis, 'tp:sess:');
    const session = create_session('u1');

    await new Promise<void>((resolve, reject) => {
      store.set('sid1', session, (err) => (err ? reject(err) : resolve()));
    });

    expect(redis_instance.set).toHaveBeenCalledWith(
      'tp:sess:sid1',
      JSON.stringify(session),
      'EX',
      60,
    );
  });

  it('returns null for missing sessions', async () => {
    const store = new RedisSessionStore(redis_instance as unknown as Redis);

    const result = await new Promise<Session | null | undefined>((resolve, reject) => {
      store.get('missing', (err, session) => (err ? reject(err) : resolve(session)));
    });

    expect(result).toBeNull();
  });

  it('parses stored sessions', async () => {
    redis_instance.get.mockResolvedValue(JSON.stringify({ user_id: 'u1' }));
    const store = new RedisSessionStore(redis_instance as unknown as Redis);

    const result = await new Promise<Session | null | undefined>((resolve, reject) => {
      store.get('sid1', (err, session) => (err ? reject(err) : resolve(session)));
    });

    expect(result).toEqual({ user_id: 'u1' });
  });

  it('destroys sessions', async () => {
    const store = new RedisSessionStore(redis_instance as unknown as Redis);

    await new Promise<void>((resolve, reject) => {
      store.destroy('sid1', (err) => (err ? reject(err) : resolve()));
    });

    expect(redis_instance.del).toHaveBeenCalledWith('tp:sess:sid1');
  });

  it('destroys all sessions for a user', async () => {
    redis_instance.scan.mockResolvedValueOnce([
      '0',
      ['tp:sess:s1', 'tp:sess:s2', 'tp:sess:s3'],
    ]);
    redis_instance.mget.mockResolvedValueOnce([
      JSON.stringify({ user_id: 'user-1' }),
      JSON.stringify({ user_id: 'user-2' }),
      JSON.stringify({ user_id: 'user-1' }),
    ]);
    redis_instance.del.mockResolvedValueOnce(2);

    const store = new RedisSessionStore(redis_instance as unknown as Redis, 'tp:sess:');
    const deleted = await store.destroy_by_user_id('user-1');

    expect(deleted).toBe(2);
    expect(redis_instance.scan).toHaveBeenCalledWith('0', 'MATCH', 'tp:sess:*', 'COUNT', 100);
    expect(redis_instance.mget).toHaveBeenCalledWith('tp:sess:s1', 'tp:sess:s2', 'tp:sess:s3');
    expect(redis_instance.del).toHaveBeenCalledWith('tp:sess:s1', 'tp:sess:s3');
  });
});

describe('create_redis_session_store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redis_instance.connect.mockResolvedValue(undefined);
    redis_instance.ping.mockResolvedValue('PONG');
  });

  it('connects and pings redis before returning store', async () => {
    const result = await create_redis_session_store({ url: 'redis://localhost:6379' });

    expect(RedisClient).toHaveBeenCalled();
    expect(redis_instance.connect).toHaveBeenCalled();
    expect(redis_instance.ping).toHaveBeenCalled();
    expect(result.store).toBeInstanceOf(RedisSessionStore);
  });

  it('disconnects and throws when redis is unavailable', async () => {
    redis_instance.connect.mockRejectedValue(new Error('connect failed'));

    await expect(create_redis_session_store({ url: 'redis://bad:6379' })).rejects.toThrow('connect failed');
    expect(redis_instance.disconnect).toHaveBeenCalled();
  });
});

describe('MemorySessionStore', () => {
  it('supports set/get/destroy', async () => {
    const store = new MemorySessionStore();
    const session = { user_id: 'u1' } as unknown as Session;

    await new Promise<void>((resolve) => store.set('sid1', session, () => resolve()));
    const got = await new Promise<Session | null | undefined>((resolve) => store.get('sid1', (_err, s) => resolve(s)));
    expect(got).toEqual(session);

    await new Promise<void>((resolve) => store.destroy('sid1', () => resolve()));
    const after = await new Promise<Session | null | undefined>((resolve) => store.get('sid1', (_err, s) => resolve(s)));
    expect(after).toBeNull();
  });

  it('destroys all sessions for a user', async () => {
    const store = new MemorySessionStore();
    const user_session_a = { user_id: 'user-1' } as unknown as Session;
    const user_session_b = { user_id: 'user-1' } as unknown as Session;
    const other_session = { user_id: 'user-2' } as unknown as Session;

    await new Promise<void>((resolve) => store.set('sid1', user_session_a, () => resolve()));
    await new Promise<void>((resolve) => store.set('sid2', other_session, () => resolve()));
    await new Promise<void>((resolve) => store.set('sid3', user_session_b, () => resolve()));

    const deleted = await store.destroy_by_user_id('user-1');

    expect(deleted).toBe(2);
    const sid1 = await new Promise<Session | null | undefined>((resolve) => store.get('sid1', (_err, s) => resolve(s)));
    const sid2 = await new Promise<Session | null | undefined>((resolve) => store.get('sid2', (_err, s) => resolve(s)));
    const sid3 = await new Promise<Session | null | undefined>((resolve) => store.get('sid3', (_err, s) => resolve(s)));
    expect(sid1).toBeNull();
    expect(sid2).toEqual(other_session);
    expect(sid3).toBeNull();
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Socket } from 'socket.io';
import type { Capability } from '@typepress/shared-types';

vi.mock('../config', () => ({
  config: {
    ADMIN_URL: 'http://localhost:4000',
    SESSION_COOKIE_NAME: 'typepress.sid',
    SESSION_SECRET: 'test-secret-test-secret-test-secret',
  },
}));

const tables = vi.hoisted(() => ({
  users: { __table: 'users' } as const,
  contents: { __table: 'contents' } as const,
}));

vi.mock('@typepress/db', () => ({
  db: {
    select: vi.fn(),
  },
  users: tables.users,
  contents: tables.contents,
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: 'eq', args })),
}));

vi.mock('../infrastructure/logger', () => ({
  create_logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { db } from '@typepress/db';
import {
  parse_cookie_header,
  unsign_cookie,
  get_session_id_from_cookie,
  create_socket_auth_middleware,
  can_edit_content,
  parse_join_editing_payload,
  parse_cursor_move_payload,
  parse_content_change_payload,
  SocketRateLimiter,
  SOCKET_RATE_LIMITS,
  MAX_CONTENT_ID_LENGTH,
  MAX_DELTA_BYTES,
} from './socket';

interface MockDb {
  select: ReturnType<typeof vi.fn>;
}

type MockSessionStore = {
  get: (sid: string, cb: (err: unknown, session: { user_id?: string } | null) => void) => void;
};

type MockSocket = {
  request: { headers: { cookie?: string } };
  data: Record<string, unknown>;
};

const mock_db = db as unknown as MockDb;

/** Creates a thenable Drizzle-like select chain that resolves to `result`. */
function make_select_chain(result: unknown[]): Record<string, ReturnType<typeof vi.fn>> {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ['from', 'where', 'limit', 'orderBy', 'offset', 'innerJoin', 'leftJoin', 'groupBy'];
  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }
  (chain as unknown as { then: unknown }).then = (resolve: (v: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

function make_signed_cookie(value: string, secret = 'test-secret-test-secret-test-secret'): string {
  const sig = createHmac('sha256', secret).update(value).digest('base64').replace(/=+$/g, '');
  return `s:${value}.${sig}`;
}

function create_mock_app(session_user_id: string | null = 'user-1'): FastifyInstance {
  const session_store: MockSessionStore = {
    get: (_sid: string, cb: (err: unknown, session: { user_id?: string } | null) => void) => {
      if (session_user_id) cb(null, { user_id: session_user_id });
      else cb(null, null);
    },
  };

  return { sessionStore: session_store } as unknown as FastifyInstance;
}

function create_mock_socket(cookie?: string): Socket {
  const socket: MockSocket = {
    request: { headers: { cookie } },
    data: {},
  };
  return socket as unknown as Socket;
}

describe('socket cookie helpers', () => {
  it('parse_cookie_header parses cookies', () => {
    expect(parse_cookie_header('a=1; typepress.sid=s%3Aabc.def; c=hello')).toEqual({
      a: '1',
      'typepress.sid': 's:abc.def',
      c: 'hello',
    });
  });

  it('unsign_cookie returns value for valid signature', () => {
    const signed = make_signed_cookie('session123');
    expect(unsign_cookie(signed.slice(2), 'test-secret-test-secret-test-secret')).toBe('session123');
  });

  it('unsign_cookie returns null for invalid signature', () => {
    expect(unsign_cookie('session123.bad', 'test-secret-test-secret-test-secret')).toBeNull();
  });

  it('get_session_id_from_cookie extracts signed session id', () => {
    const cookie = `typepress.sid=${encodeURIComponent(make_signed_cookie('sid-1'))}`;
    expect(get_session_id_from_cookie(cookie)).toBe('sid-1');
  });

  it('get_session_id_from_cookie returns null for missing cookie', () => {
    expect(get_session_id_from_cookie('a=1')).toBeNull();
  });
});

describe('create_socket_auth_middleware', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rejects connection without session cookie', async () => {
    const middleware = create_socket_auth_middleware(create_mock_app('user-1'));
    const socket = create_mock_socket();
    const next = vi.fn();

    await middleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'UNAUTHORIZED' }));
    expect(socket.data.user_id).toBeUndefined();
  });

  it('rejects connection with invalid/expired session', async () => {
    mock_db.select.mockReturnValueOnce(make_select_chain([{ id: 'user-1', name: 'Alice', capabilities: [] }]));
    const middleware = create_socket_auth_middleware(create_mock_app(null));
    const cookie = `typepress.sid=${encodeURIComponent(make_signed_cookie('sid-1'))}`;
    const socket = create_mock_socket(cookie);
    const next = vi.fn();

    await middleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'UNAUTHORIZED' }));
  });

  it('rejects connection when user not found', async () => {
    mock_db.select.mockReturnValueOnce(make_select_chain([]));
    const middleware = create_socket_auth_middleware(create_mock_app('user-1'));
    const cookie = `typepress.sid=${encodeURIComponent(make_signed_cookie('sid-1'))}`;
    const socket = create_mock_socket(cookie);
    const next = vi.fn();

    await middleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'UNAUTHORIZED' }));
  });

  it('accepts authenticated connection and sets socket user data', async () => {
    mock_db.select.mockReturnValueOnce(
      make_select_chain([{ id: 'user-1', name: 'Alice', capabilities: ['content:edit:any'] }]),
    );
    const middleware = create_socket_auth_middleware(create_mock_app('user-1'));
    const cookie = `typepress.sid=${encodeURIComponent(make_signed_cookie('sid-1'))}`;
    const socket = create_mock_socket(cookie);
    const next = vi.fn();

    await middleware(socket, next);

    expect(next).toHaveBeenCalledWith();
    expect(socket.data.user_id).toBe('user-1');
    expect(socket.data.user_name).toBe('Alice');
    expect(socket.data.capabilities).toEqual(['content:edit:any']);
  });
});

describe('can_edit_content', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('allows user with content:edit:any', async () => {
    const capabilities: Capability[] = ['content:edit:any'];
    await expect(can_edit_content('u1', capabilities, 'c1')).resolves.toBe(true);
    expect(mock_db.select).not.toHaveBeenCalled();
  });

  it('allows owner with content:edit:own', async () => {
    mock_db.select.mockReturnValueOnce(make_select_chain([{ author_id: 'u1' }]));
    const capabilities: Capability[] = ['content:edit:own'];
    await expect(can_edit_content('u1', capabilities, 'c1')).resolves.toBe(true);
  });

  it('rejects non-owner with only content:edit:own', async () => {
    mock_db.select.mockReturnValueOnce(make_select_chain([{ author_id: 'u2' }]));
    const capabilities: Capability[] = ['content:edit:own'];
    await expect(can_edit_content('u1', capabilities, 'c1')).resolves.toBe(false);
  });

  it('rejects user without edit capability', async () => {
    // Use a valid capability that does not grant content edit access.
    const capabilities: Capability[] = ['media:upload'];
    await expect(can_edit_content('u1', capabilities, 'c1')).resolves.toBe(false);
  });

  it('allows settings:manage as super-admin override', async () => {
    // CapabilityChecker.has() grants any capability when settings:manage is present.
    const capabilities: Capability[] = ['settings:manage'];
    await expect(can_edit_content('u1', capabilities, 'c1')).resolves.toBe(true);
  });
});

describe('socket payload validation', () => {
  it('parse_join_editing_payload accepts valid payload', () => {
    expect(parse_join_editing_payload({ content_id: 'content-1' })).toEqual({ content_id: 'content-1' });
  });

  it('parse_join_editing_payload rejects invalid payloads', () => {
    expect(parse_join_editing_payload(null)).toBeNull();
    expect(parse_join_editing_payload(undefined)).toBeNull();
    expect(parse_join_editing_payload([])).toBeNull();
    expect(parse_join_editing_payload('content-1')).toBeNull();
    expect(parse_join_editing_payload({})).toBeNull();
    expect(parse_join_editing_payload({ content_id: '' })).toBeNull();
    expect(parse_join_editing_payload({ content_id: 123 })).toBeNull();
    expect(parse_join_editing_payload({ content_id: 'a'.repeat(MAX_CONTENT_ID_LENGTH + 1) })).toBeNull();
  });

  it('parse_cursor_move_payload accepts valid payload', () => {
    expect(parse_cursor_move_payload({ content_id: 'content-1', position: 42 })).toEqual({
      content_id: 'content-1',
      position: 42,
    });
  });

  it('parse_cursor_move_payload rejects invalid payloads', () => {
    expect(parse_cursor_move_payload(null)).toBeNull();
    expect(parse_cursor_move_payload({ content_id: 'c1' })).toBeNull();
    expect(parse_cursor_move_payload({ content_id: 'c1', position: -1 })).toBeNull();
    expect(parse_cursor_move_payload({ content_id: 'c1', position: Number.NaN })).toBeNull();
    expect(parse_cursor_move_payload({ content_id: 'c1', position: Number.POSITIVE_INFINITY })).toBeNull();
    expect(parse_cursor_move_payload({ content_id: 'c1', position: '3' })).toBeNull();
    expect(parse_cursor_move_payload({ content_id: '', position: 1 })).toBeNull();
  });

  it('parse_content_change_payload accepts valid payload', () => {
    const payload = { content_id: 'content-1', delta: { ops: [{ insert: 'hi' }] } };
    expect(parse_content_change_payload(payload)).toEqual(payload);
  });

  it('parse_content_change_payload rejects invalid or oversized payloads', () => {
    expect(parse_content_change_payload(null)).toBeNull();
    expect(parse_content_change_payload({ content_id: 'c1' })).toBeNull();
    expect(parse_content_change_payload({ content_id: 'c1', delta: undefined })).toBeNull();
    expect(parse_content_change_payload({ content_id: '', delta: {} })).toBeNull();

    const oversized_delta = { text: 'x'.repeat(MAX_DELTA_BYTES + 100) };
    expect(parse_content_change_payload({ content_id: 'c1', delta: oversized_delta })).toBeNull();

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(parse_content_change_payload({ content_id: 'c1', delta: circular })).toBeNull();
  });
});

describe('SocketRateLimiter', () => {
  it('allows events within configured limit and blocks when exceeded', () => {
    const limiter = new SocketRateLimiter({
      'join:editing': { max_events: 2, window_ms: 1000 },
      'cursor:move': { max_events: 30, window_ms: 1000 },
      'content:change': { max_events: 20, window_ms: 1000 },
    });

    expect(limiter.check('join:editing', 100)).toBe(true);
    expect(limiter.check('join:editing', 200)).toBe(true);
    expect(limiter.check('join:editing', 300)).toBe(false);
  });

  it('resets counter after window elapses', () => {
    const limiter = new SocketRateLimiter({
      'join:editing': { max_events: 1, window_ms: 1000 },
      'cursor:move': { max_events: 1, window_ms: 1000 },
      'content:change': { max_events: 1, window_ms: 1000 },
    });

    expect(limiter.check('cursor:move', 1000)).toBe(true);
    expect(limiter.check('cursor:move', 1500)).toBe(false);
    expect(limiter.check('cursor:move', 2000)).toBe(true);
  });

  it('uses configured realtime limits for known events', () => {
    expect(SOCKET_RATE_LIMITS['join:editing'].max_events).toBeGreaterThan(0);
    expect(SOCKET_RATE_LIMITS['cursor:move'].max_events).toBeGreaterThan(0);
    expect(SOCKET_RATE_LIMITS['content:change'].max_events).toBeGreaterThan(0);
  });
});
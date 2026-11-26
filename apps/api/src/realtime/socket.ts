/**
 * Socket.IO Integration — Real-time collaboration for Typepress.
 *
 * Handles:
 *   - Room-based editing sessions (one room per content item)
 *   - User presence tracking (who's editing what)
 *   - Cursor position broadcasting
 *   - Content change notifications
 *
 * Security:
 *   - Connections require a valid authenticated session cookie
 *   - Room joins require content edit capability (edit:any or edit:own + ownership)
 *   - Content/cursor broadcasts require authenticated room membership
 *   - Presence data is scoped to authorized room members only
 *
 * Architecture:
 *   Client → Socket.IO (auth) → Room → Redis Pub/Sub → Other Clients
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Server } from 'http';
import type { FastifyInstance } from 'fastify';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import { db, contents, users } from '@typepress/db';
import { eq } from 'drizzle-orm';
import { CapabilityChecker } from '@typepress/core';
import type { Capability } from '@typepress/shared-types';
import { config } from '../config';
import { create_logger } from '../infrastructure/logger';

const log = create_logger('Socket');

interface EditorPresence {
  user_id: string;
  user_name: string;
  color: string;
  cursor_position?: number;
  last_active: number;
}

interface SocketSessionData {
  user_id: string;
}

interface SessionStoreLike {
  get: (
    sid: string,
    callback: (err: unknown, session: SocketSessionData | null | undefined) => void,
  ) => void;
}

interface AuthenticatedSocketData {
  user_id: string;
  user_name: string;
  capabilities?: Capability[];
  presence?: EditorPresence;
  room?: string;
  content_id?: string;
}

/** Supported realtime event names with rate-limit policies. */
export type SocketEventName = 'join:editing' | 'cursor:move' | 'content:change';

interface RateLimitConfig {
  max_events: number;
  window_ms: number;
}

interface RateLimitState {
  count: number;
  reset_at: number;
}

/** Max content_id length - covers cuid/uuid with margin. */
export const MAX_CONTENT_ID_LENGTH = 128;
/** Max cursor position to prevent absurd values from clients. */
export const MAX_CURSOR_POSITION = 10_000_000;
/** Max serialized delta payload size in bytes to limit abuse. */
export const MAX_DELTA_BYTES = 65_536;

/** Per-socket, per-event fixed-window limits. */
export const SOCKET_RATE_LIMITS: Record<SocketEventName, RateLimitConfig> = {
  'join:editing': { max_events: 10, window_ms: 10_000 },
  'cursor:move': { max_events: 30, window_ms: 1_000 },
  'content:change': { max_events: 20, window_ms: 1_000 },
};

export interface JoinEditingPayload {
  content_id: string;
}

export interface CursorMovePayload {
  content_id: string;
  position: number;
}

export interface ContentChangePayload {
  content_id: string;
  delta: unknown;
}

const PRESENCE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

let color_index = 0;

function get_next_color(): string {
  const color = PRESENCE_COLORS[color_index % PRESENCE_COLORS.length]!;
  color_index++;
  return color;
}

/** Parse Cookie header into key/value map. */
export function parse_cookie_header(cookie_header: string | string[] | undefined): Record<string, string> {
  const header = Array.isArray(cookie_header) ? cookie_header.join('; ') : cookie_header;
  if (!header) return {};

  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }
  return cookies;
}

/**
 * Unsign a cookie value signed with cookie-signature format: value.signature
 * Returns the original value when valid, otherwise null.
 */
export function unsign_cookie(signed_value: string, secret: string): string | null {
  const separator_index = signed_value.lastIndexOf('.');
  if (separator_index <= 0) return null;

  const value = signed_value.slice(0, separator_index);
  const signature = signed_value.slice(separator_index + 1);
  if (!value || !signature) return null;

  const expected = createHmac('sha256', secret).update(value).digest('base64').replace(/=+$/g, '');
  const expected_buf = Buffer.from(expected);
  const signature_buf = Buffer.from(signature);
  if (expected_buf.length !== signature_buf.length) return null;
  if (!timingSafeEqual(expected_buf, signature_buf)) return null;

  return value;
}

/** Extract session ID from the configured session cookie. */
export function get_session_id_from_cookie(cookie_header: string | string[] | undefined): string | null {
  const cookies = parse_cookie_header(cookie_header);
  const raw = cookies[config.SESSION_COOKIE_NAME];
  if (!raw) return null;

  // @fastify/cookie signs cookies as s:<value>.<signature>
  const signed = raw.startsWith('s:') ? raw.slice(2) : raw;
  return unsign_cookie(signed, config.SESSION_SECRET);
}

function get_session_store(app: FastifyInstance): SessionStoreLike | null {
  const store = (app as FastifyInstance & { sessionStore?: SessionStoreLike }).sessionStore;
  if (!store || typeof store.get !== 'function') return null;
  return store;
}

function get_session_user_id(store: SessionStoreLike, session_id: string): Promise<string | null> {
  return new Promise((resolve) => {
    store.get(session_id, (err, session) => {
      if (err || !session) return resolve(null);
      const user_id = session.user_id;
      resolve(typeof user_id === 'string' && user_id.length > 0 ? user_id : null);
    });
  });
}

async function get_authenticated_user(user_id: string): Promise<{ id: string; name: string; capabilities: Capability[] } | null> {
  const [user] = await db
    .select({ id: users.id, name: users.name, capabilities: users.capabilities })
    .from(users)
    .where(eq(users.id, user_id))
    .limit(1);
  if (!user) return null;
  return {
    id: user.id,
    name: user.name ?? '',
    capabilities: user.capabilities as Capability[],
  };
}

/** Narrow unknown payloads to plain object records. */
function is_plain_object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function is_valid_content_id(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_CONTENT_ID_LENGTH;
}

/** Validate join:editing payload shape and bounds. */
export function parse_join_editing_payload(payload: unknown): JoinEditingPayload | null {
  if (!is_plain_object(payload)) return null;
  if (!is_valid_content_id(payload.content_id)) return null;
  return { content_id: payload.content_id };
}

/** Validate cursor:move payload shape and bounds. */
export function parse_cursor_move_payload(payload: unknown): CursorMovePayload | null {
  if (!is_plain_object(payload)) return null;
  if (!is_valid_content_id(payload.content_id)) return null;
  const { position } = payload;
  if (typeof position !== 'number' || !Number.isFinite(position)) return null;
  if (position < 0 || position > MAX_CURSOR_POSITION) return null;
  return { content_id: payload.content_id, position };
}

/** Validate content:change payload shape and bound serialized delta size. */
export function parse_content_change_payload(payload: unknown): ContentChangePayload | null {
  if (!is_plain_object(payload)) return null;
  if (!is_valid_content_id(payload.content_id)) return null;
  if (!('delta' in payload)) return null;
  const { delta } = payload;
  if (delta === undefined) return null;

  // Bound serialized size to prevent oversized realtime payload abuse.
  try {
    const serialized = JSON.stringify(delta);
    if (serialized === undefined) return null;
    if (Buffer.byteLength(serialized, 'utf8') > MAX_DELTA_BYTES) return null;
  } catch {
    return null;
  }

  return { content_id: payload.content_id, delta };
}

/** Simple per-socket fixed-window rate limiter for realtime events. */
export class SocketRateLimiter {
  private readonly windows = new Map<string, RateLimitState>();

  constructor(private readonly limits: Record<string, RateLimitConfig>) {}

  /** Returns true when event is within limit; false when it should be rejected. */
  check(event: string, now: number = Date.now()): boolean {
    const limit = this.limits[event];
    if (!limit) return true;

    const current = this.windows.get(event);
    if (!current || now >= current.reset_at) {
      this.windows.set(event, { count: 1, reset_at: now + limit.window_ms });
      return true;
    }

    if (current.count >= limit.max_events) {
      return false;
    }

    current.count += 1;
    return true;
  }
}

export function create_socket_rate_limiter(): SocketRateLimiter {
  return new SocketRateLimiter(SOCKET_RATE_LIMITS);
}

/** Check whether a user can edit content (any-content or own-content capability). */
export async function can_edit_content(user_id: string, capabilities: Capability[], content_id: string): Promise<boolean> {
  const caps = new CapabilityChecker(capabilities);
  if (caps.has('content:edit:any' as Capability)) return true;

  if (caps.has('content:edit:own' as Capability)) {
    const [content] = await db
      .select({ author_id: contents.author_id })
      .from(contents)
      .where(eq(contents.id, content_id))
      .limit(1);
    if (content && content.author_id === user_id) return true;
  }

  return false;
}

function get_socket_data(socket: Socket): AuthenticatedSocketData {
  return socket.data as AuthenticatedSocketData;
}

function collect_room_presences(io: SocketIOServer, room: string, exclude_socket_id?: string): EditorPresence[] {
  const room_sockets = io.sockets.adapter.rooms.get(room);
  const presences: EditorPresence[] = [];
  if (!room_sockets) return presences;

  for (const id of room_sockets) {
    if (exclude_socket_id && id === exclude_socket_id) continue;
    const s = io.sockets.sockets.get(id);
    const presence = s?.data.presence as EditorPresence | undefined;
    if (presence) presences.push(presence);
  }
  return presences;
}

export function create_socket_auth_middleware(app: FastifyInstance) {
  return async (socket: Socket, next: (err?: Error) => void): Promise<void> => {
    try {
      const session_id = get_session_id_from_cookie(socket.request.headers.cookie);
      if (!session_id) {
        next(new Error('UNAUTHORIZED'));
        return;
      }

      const store = get_session_store(app);
      if (!store) {
        log.error('Socket auth failed: session store unavailable');
        next(new Error('UNAUTHORIZED'));
        return;
      }

      const user_id = await get_session_user_id(store, session_id);
      if (!user_id) {
        next(new Error('UNAUTHORIZED'));
        return;
      }

      const user = await get_authenticated_user(user_id);
      if (!user) {
        next(new Error('UNAUTHORIZED'));
        return;
      }

      const data = get_socket_data(socket);
      data.user_id = user.id;
      data.user_name = user.name;
      data.capabilities = user.capabilities;

      next();
    } catch (error) {
      log.error('Socket auth error', error);
      next(new Error('UNAUTHORIZED'));
    }
  };
}

/**
 * Create and configure the Socket.IO server.
 * Attaches to an existing HTTP server (Fastify's underlying server).
 */
export function create_socket_server(http_server: Server, app: FastifyInstance): SocketIOServer {
  const io = new SocketIOServer(http_server, {
    cors: {
      origin: config.ADMIN_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(create_socket_auth_middleware(app));

  io.on('connection', (socket) => {
    const data = get_socket_data(socket);
    const rate_limiter = create_socket_rate_limiter();
    log.info(` Client connected: ${socket.id} (user=${data.user_id})`);

    const emit_realtime_error = (code: string, message: string): void => {
      socket.emit('error:realtime', { code, message });
    };

    // Join an editing room for a specific content item
    socket.on('join:editing', async (payload: unknown) => {
      try {
        if (!rate_limiter.check('join:editing')) {
          emit_realtime_error('RATE_LIMITED', 'Too many join:editing requests');
          return;
        }

        const parsed = parse_join_editing_payload(payload);
        if (!parsed) {
          emit_realtime_error('INVALID_PAYLOAD', 'Invalid join:editing payload');
          return;
        }

        const { content_id } = parsed;
        const capabilities = data.capabilities ?? [];
        const allowed = await can_edit_content(data.user_id, capabilities, content_id);
        if (!allowed) {
          socket.emit('error:auth', {
            code: 'FORBIDDEN',
            message: 'Not authorized to edit this content',
          });
          return;
        }

        const room = `editing:${content_id}`;

        // Leave previous room if joining another.
        if (data.room && data.room !== room) {
          const previous_room = data.room;
          socket.leave(previous_room);
          io.to(previous_room).emit('presence:update', collect_room_presences(io, previous_room));
        }

        socket.join(room);

        const presence: EditorPresence = {
          user_id: data.user_id,
          user_name: data.user_name,
          color: data.presence?.color ?? get_next_color(),
          last_active: Date.now(),
        };

        data.presence = presence;
        data.room = room;
        data.content_id = content_id;

        io.to(room).emit('presence:update', collect_room_presences(io, room));
        log.info(` ${data.user_name} joined room ${room}`);
      } catch (error) {
        log.error('join:editing failed', error);
        socket.emit('error:auth', { code: 'INTERNAL_ERROR', message: 'Failed to join editing room' });
      }
    });

    // Broadcast cursor position
    socket.on('cursor:move', (payload: unknown) => {
      if (!rate_limiter.check('cursor:move')) {
        emit_realtime_error('RATE_LIMITED', 'Too many cursor:move events');
        return;
      }

      const parsed = parse_cursor_move_payload(payload);
      if (!parsed) {
        emit_realtime_error('INVALID_PAYLOAD', 'Invalid cursor:move payload');
        return;
      }

      const { content_id, position } = parsed;
      const room = `editing:${content_id}`;
      if (data.room !== room || data.content_id !== content_id || !data.presence) return;

      data.presence.cursor_position = position;
      data.presence.last_active = Date.now();
      socket.to(room).emit('cursor:update', {
        user_id: data.user_id,
        position,
        color: data.presence.color,
      });
    });

    // Broadcast content changes
    socket.on('content:change', (payload: unknown) => {
      if (!rate_limiter.check('content:change')) {
        emit_realtime_error('RATE_LIMITED', 'Too many content:change events');
        return;
      }

      const parsed = parse_content_change_payload(payload);
      if (!parsed) {
        emit_realtime_error('INVALID_PAYLOAD', 'Invalid content:change payload');
        return;
      }

      const { content_id, delta } = parsed;
      const room = `editing:${content_id}`;
      if (data.room !== room || data.content_id !== content_id) return;

      socket.to(room).emit('content:sync', {
        content_id,
        delta,
        user_id: data.user_id,
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const room = data.room;
      const presence = data.presence;

      if (room && presence) {
        io.to(room).emit('presence:update', collect_room_presences(io, room, socket.id));
        log.info(` ${presence.user_name} left room ${room}`);
      }
    });
  });

  console.log('[Socket] Socket.IO server initialized');
  return io;
}

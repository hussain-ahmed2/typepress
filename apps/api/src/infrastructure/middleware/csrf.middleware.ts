/**
 * CSRF Middleware — Session-bound token validation for cookie-authenticated state changes.
 *
 * Protects against cross-site request forgery when auth relies on cookies.
 * Clients must fetch a token from GET /api/auth/csrf and send it on mutating requests
 * via the `x-csrf-token` header.
 *
 * Policy:
 * - Safe methods (GET, HEAD, OPTIONS) are exempt.
 * - Exempt paths: /api/auth/login, /api/auth/register, /api/auth/logout, /api/auth/csrf,
 *   /api/auth/forgot-password, /api/auth/reset-password, /api/auth/verify-email, /api/auth/resend-verification.
 *   These are pre-auth/bootstrap endpoints; token-based flows still require valid one-time tokens.
 * - All other mutating requests require a valid session-bound CSRF token.
 * - For mutating requests, when an Origin or Referer header is present, it must match
 *   trusted origins (ADMIN_URL + CSRF_TRUSTED_ORIGINS). Missing Origin/Referer is allowed
 *   for non-browser/server-to-server clients; token validation still applies.
 *
 * Env:
 * - CSRF_PROTECTION=true|false (default: enabled except NODE_ENV=test)
 * - CSRF_ORIGIN_CHECK=true|false (default: follows CSRF_PROTECTION)
 * - CSRF_TRUSTED_ORIGINS=comma,separated,origins (optional; ADMIN_URL is always trusted)
 */
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/csrf',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
]);

function is_exempt_path(url: string): boolean {
  const path = url.split('?')[0] ?? url;
  return EXEMPT_PATHS.has(path);
}

function get_header_token(request: FastifyRequest): string | undefined {
  const value = request.headers[CSRF_HEADER];
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' ? value : undefined;
}

function normalize_origin(value: string): string | null {
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

function get_trusted_origins(): Set<string> {
  const origins = new Set<string>();
  const admin_url = process.env.ADMIN_URL;
  if (admin_url) {
    const normalized = normalize_origin(admin_url);
    if (normalized) origins.add(normalized);
  }

  const extra = process.env.CSRF_TRUSTED_ORIGINS;
  if (extra) {
    for (const entry of extra.split(',')) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      const normalized = normalize_origin(trimmed);
      if (normalized) origins.add(normalized);
    }
  }

  return origins;
}

function get_request_origin(request: FastifyRequest): string | null | undefined {
  const origin_header = request.headers.origin;
  if (typeof origin_header === 'string' && origin_header.length > 0) {
    if (origin_header === 'null') return null;
    return normalize_origin(origin_header);
  }

  const referer_header = request.headers.referer;
  if (typeof referer_header === 'string' && referer_header.length > 0) {
    return normalize_origin(referer_header);
  }

  return undefined;
}

function origin_check_enabled(): boolean {
  const origin_env = process.env.CSRF_ORIGIN_CHECK;
  if (origin_env === 'true') return true;
  if (origin_env === 'false') return false;
  return csrf_enabled();
}

function tokens_match(expected: string, provided: string): boolean {
  const expected_buffer = Buffer.from(expected);
  const provided_buffer = Buffer.from(provided);
  if (expected_buffer.length !== provided_buffer.length) return false;
  return timingSafeEqual(expected_buffer, provided_buffer);
}

export function get_or_create_csrf_token(request: FastifyRequest): string {
  const existing = request.session.get('csrf_token');
  if (typeof existing === 'string' && existing.length > 0) return existing;

  const token = randomBytes(32).toString('hex');
  request.session.set('csrf_token', token);
  return token;
}

function csrf_enabled(): boolean {
  const csrf_env = process.env.CSRF_PROTECTION;
  if (csrf_env === 'true') return true;
  if (csrf_env === 'false') return false;
  return process.env.NODE_ENV !== 'test';
}

export async function require_csrf(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!csrf_enabled()) return;
  if (SAFE_METHODS.has(request.method.toUpperCase())) return;
  if (is_exempt_path(request.url)) return;

  if (origin_check_enabled()) {
    const request_origin = get_request_origin(request);
    if (request_origin !== undefined) {
      const trusted_origins = get_trusted_origins();
      // If no trusted origins are configured, skip origin enforcement rather than lock out.
      if (trusted_origins.size > 0 && (request_origin === null || !trusted_origins.has(request_origin))) {
        return reply.status(403).send({
          success: false,
          error: { code: 'CSRF_ORIGIN_INVALID', message: 'Invalid request origin' },
        });
      }
    }
  }

  const session_token = request.session.get('csrf_token');
  const header_token = get_header_token(request);

  if (typeof session_token !== 'string' || session_token.length === 0) {
    return reply.status(403).send({
      success: false,
      error: { code: 'CSRF_TOKEN_MISSING', message: 'CSRF session token missing' },
    });
  }

  if (!header_token || !tokens_match(session_token, header_token)) {
    return reply.status(403).send({
      success: false,
      error: { code: 'CSRF_TOKEN_INVALID', message: 'Invalid CSRF token' },
    });
  }
}
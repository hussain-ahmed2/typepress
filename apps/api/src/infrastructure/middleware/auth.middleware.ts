/**
 * Auth Middleware — Session-based authentication and capability guards.
 *
 * Hook: attach_session_user (onRequest/preHandler) bridges session user_id to request.user_id.
 * Middleware: require_auth — Ensures request.user_id is present (401 if not).
 * Middleware: require_capability — Ensures authenticated user has a specific capability (403 if not).
 *
 * Session data is stored in Redis in production, memory in development.
 *
 * Usage in routes:
 *   app.post('/content', {
 *     preHandler: [require_auth, require_capability('content:create')],
 *   }, handler);
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, users } from '@typepress/db';
import { CapabilityChecker } from '@typepress/core';
import type { Capability } from '@typepress/shared-types';

/**
 * Extended request type available after require_auth middleware runs.
 * Downstream handlers can safely access request.user_id.
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user_id: string;
}

/**
 * Bridges the session user_id to request.user_id for downstream handlers.
 * Register globally after session is registered so require_auth and route handlers
 * can rely on request.user_id being populated for authenticated sessions.
 */
export async function attach_session_user(request: FastifyRequest): Promise<void> {
  const session_user_id = request.session?.user_id;
  if (typeof session_user_id === 'string' && session_user_id.length > 0) {
    request.user_id = session_user_id;
  }
}

/**
 * Middleware: requires an authenticated user on the request.
 * Returns 401 if not authenticated.
 */
export async function require_auth(request: FastifyRequest, reply: FastifyReply) {
  const { user_id } = request;

  if (!user_id) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }
}

async function get_user_capabilities(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<CapabilityChecker | null> {
  const { user_id } = request;

  if (!user_id) {
    reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return null;
  }

  // Fetch user capabilities from DB.
  // TODO: Cache this in Redis to avoid per-request DB hits.
  const [user] = await db
    .select({ capabilities: users.capabilities })
    .from(users)
    .where(eq(users.id, user_id))
    .limit(1);

  if (!user) {
    reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'User not found' },
    });
    return null;
  }

  const capabilities = user.capabilities as Capability[];
  request.capabilities = capabilities;
  return new CapabilityChecker(capabilities);
}

/**
 * Middleware factory: returns a preHandler that checks for a specific capability.
 * Must be used AFTER require_auth — it reads user_id from the request.
 *
 * @param capability - Required capability string (e.g., "content:create")
 */
export function require_capability(capability: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const caps = await get_user_capabilities(request, reply);
    if (!caps) return;

    if (!caps.has(capability as Capability)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Missing required capability: ${capability}`,
        },
      });
    }
  };
}

/**
 * Middleware factory: requires ANY of the listed capabilities.
 * Useful for backward-compatible capability transitions.
 */
export function require_any_capability(capabilities: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const caps = await get_user_capabilities(request, reply);
    if (!caps) return;

    const allowed = capabilities.some((cap) => caps.has(cap as Capability));
    if (!allowed) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Missing required capability: ${capabilities.join(' or ')}`,
        },
      });
    }
  };
}

/**
 * Auth Middleware — Session-based authentication and capability guards.
 *
 * Two middleware functions:
 *   1. require_auth — Ensures a valid session exists, attaches user_id to request
 *   2. require_capability — Ensures the authenticated user has a specific capability
 *
 * Session data is stored in Redis in production, memory in development.
 *
 * Usage in routes:
 *   app.post('/content', {
 *     preHandler: [require_auth, require_capability('content:create')],
 *   }, handler);
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@typepress/db';
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
 * Middleware: requires an active session with a valid user_id.
 * Returns 401 if not authenticated.
 */
export async function require_auth(request: FastifyRequest, reply: FastifyReply) {
  const user_id = (request as AuthenticatedRequest).user_id;

  if (!user_id) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }
}

/**
 * Middleware factory: returns a preHandler that checks for a specific capability.
 * Must be used AFTER require_auth — it reads user_id from the request.
 *
 * @param capability - Required capability string (e.g., "content:create")
 */
export function require_capability(capability: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user_id = (request as AuthenticatedRequest).user_id;

    if (!user_id) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    // Fetch user capabilities from DB.
    // TODO: Cache this in Redis to avoid per-request DB hits.
    const user = await prisma.user.findUnique({
      where: { id: user_id },
      select: { capabilities: true },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not found' },
      });
    }

    const caps = new CapabilityChecker(user.capabilities as Capability[]);

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

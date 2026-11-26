/**
 * GraphQL Context — Builds per-request context for GraphQL resolvers.
 *
 * Bridges Fastify request/session into GraphQL, and provides auth guards
 * that throw GraphQL errors (not HTTP replies) for resolver use.
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { GraphQLError } from 'graphql';
import { db, users } from '@typepress/db';
import { eq } from 'drizzle-orm';
import { CapabilityChecker } from '@typepress/core';
import type { Capability } from '@typepress/shared-types';

export interface GraphQLContext {
  request: FastifyRequest;
  reply: FastifyReply;
  user_id: string | null;
}

/** Authenticated actor with resolved capabilities for resolver-level authorization. */
export interface GraphQLActor {
  user_id: string;
  capabilities: CapabilityChecker;
}

interface FastifySessionLike {
  get?: (key: string) => unknown;
  user_id?: string;
}

/**
 * Extract the authenticated user id from a Fastify request session.
 * Defensive: supports @fastify/session get() API and direct property access.
 */
export function get_session_user_id(request: FastifyRequest): string | null {
  const session = (request as FastifyRequest & { session?: FastifySessionLike }).session;
  if (!session) return null;

  const from_get = typeof session.get === 'function' ? session.get('user_id') : undefined;
  const raw = from_get ?? session.user_id;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

export function build_graphql_context(request: FastifyRequest, reply: FastifyReply): GraphQLContext {
  return {
    request,
    reply,
    user_id: get_session_user_id(request),
  };
}

export function require_auth(context: GraphQLContext): string {
  if (!context.user_id) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHORIZED', http: { status: 401 } },
    });
  }
  return context.user_id;
}

export async function require_capability(context: GraphQLContext, capability: string): Promise<string> {
  const user_id = require_auth(context);

  const [user] = await db
    .select({ capabilities: users.capabilities })
    .from(users)
    .where(eq(users.id, user_id))
    .limit(1);

  if (!user) {
    throw new GraphQLError('User not found', {
      extensions: { code: 'UNAUTHORIZED', http: { status: 401 } },
    });
  }

  const caps = new CapabilityChecker(user.capabilities as Capability[]);
  if (!caps.has(capability as Capability)) {
    throw new GraphQLError(`Missing required capability: ${capability}`, {
      extensions: { code: 'FORBIDDEN', http: { status: 403 } },
    });
  }

  return user_id;
}

export async function require_any_capability(
  context: GraphQLContext,
  capabilities: string[],
): Promise<string> {
  const user_id = require_auth(context);

  const [user] = await db
    .select({ capabilities: users.capabilities })
    .from(users)
    .where(eq(users.id, user_id))
    .limit(1);

  if (!user) {
    throw new GraphQLError('User not found', {
      extensions: { code: 'UNAUTHORIZED', http: { status: 401 } },
    });
  }

  const caps = new CapabilityChecker(user.capabilities as Capability[]);
  if (!caps.has_any(capabilities as Capability[])) {
    throw new GraphQLError(`Missing required capability: one of ${capabilities.join(', ')}`, {
      extensions: { code: 'FORBIDDEN', http: { status: 403 } },
    });
  }

  return user_id;
}

/**
 * Resolve the authenticated actor with capabilities.
 * Use this when resolvers need both identity and capability checks (e.g. ownership + publish).
 */
export async function require_actor(context: GraphQLContext): Promise<GraphQLActor> {
  const user_id = require_auth(context);

  const [user] = await db
    .select({ capabilities: users.capabilities })
    .from(users)
    .where(eq(users.id, user_id))
    .limit(1);

  if (!user) {
    throw new GraphQLError('User not found', {
      extensions: { code: 'UNAUTHORIZED', http: { status: 401 } },
    });
  }

  return {
    user_id,
    capabilities: new CapabilityChecker(user.capabilities as Capability[]),
  };
}

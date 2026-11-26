/**
 * Comment Routes — HTTP handlers for comment listing, creation, moderation, and deletion.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { CapabilityChecker } from '@typepress/core';
import { db, users } from '@typepress/db';
import type { Capability } from '@typepress/shared-types';
import { require_auth, require_capability, validate_body, validate_query } from '../../infrastructure/middleware';
import { CommentService } from './comment.service';
import { create_comment_schema, list_comments_schema, moderate_comment_schema } from './comment.validators';
import '../../types';

const comment_service = new CommentService();

/** Simple in-memory IP rate limiter for public comment creation. */
const comment_rate_limit_window_ms = 60_000;
const comment_rate_limit_max = 5;
const comment_rate_limit_hits = new Map<string, { count: number; reset_at: number }>();

function get_request_ip(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() || request.ip;
  }
  return request.ip;
}

async function rate_limit_create_comment(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const ip = get_request_ip(request);
  const now = Date.now();
  const current = comment_rate_limit_hits.get(ip);

  if (!current || now > current.reset_at) {
    comment_rate_limit_hits.set(ip, { count: 1, reset_at: now + comment_rate_limit_window_ms });
    return;
  }

  if (current.count >= comment_rate_limit_max) {
    reply.status(429).send({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many comments. Please try again later.' },
    });
    return;
  }

  current.count += 1;
  comment_rate_limit_hits.set(ip, current);
}

async function is_moderator(request: FastifyRequest): Promise<boolean> {
  const user_id = request.user_id;
  if (!user_id) return false;

  if (request.capabilities) {
    return new CapabilityChecker(request.capabilities).has('comment:moderate');
  }

  const [user] = await db
    .select({ capabilities: users.capabilities })
    .from(users)
    .where(eq(users.id, user_id))
    .limit(1);
  if (!user) return false;

  const capabilities = user.capabilities as Capability[];
  request.capabilities = capabilities;
  return new CapabilityChecker(capabilities).has('comment:moderate');
}

export async function comment_routes(app: FastifyInstance) {
  /** GET / — List comments. Moderators can filter all statuses; public callers only see approved comments. */
  app.get('/', {
    preHandler: [validate_query(list_comments_schema)],
  }, async (request, reply) => {
    const query = request.query as {
      page: number;
      limit: number;
      status?: 'PENDING' | 'APPROVED' | 'SPAM' | 'TRASH';
      content_id?: string;
      search?: string;
    };

    const moderator = await is_moderator(request);
    if (!moderator) {
      query.status = 'APPROVED';
    }

    const result = await comment_service.list(query);
    if (!moderator && result.success && result.data) {
      result.data = result.data.map((comment) => ({ ...comment, author_email: null }));
    }
    return reply.send(result);
  });

  /** GET /:id — Get comment by ID. Moderators can view any comment; public callers can view approved comments. */
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await comment_service.get_by_id(id);
    if (!result.success) return reply.status(404).send(result);

    const moderator = await is_moderator(request);
    if (!moderator && result.data?.status !== 'APPROVED') {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Comment not found' },
      });
    }

    if (!moderator && result.success && result.data) {
      result.data = { ...result.data, author_email: null };
    }
    return reply.send(result);
  });

  /** POST / — Create a comment (public, rate-limited). */
  app.post('/', {
    preHandler: [rate_limit_create_comment, validate_body(create_comment_schema)],
  }, async (request, reply) => {
    const result = await comment_service.create(request.body as never, { user_id: request.user_id });
    if (!result.success) {
      const status = result.error?.code === 'NOT_FOUND' ? 404 : 400;
      return reply.status(status).send(result);
    }
    return reply.status(201).send(result);
  });

  /** PATCH /:id/moderate — Update comment moderation status. */
  app.patch('/:id/moderate', {
    preHandler: [require_auth, require_capability('comment:moderate'), validate_body(moderate_comment_schema)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await comment_service.moderate(id, request.body as never);
    if (!result.success) {
      const status = result.error?.code === 'NOT_FOUND' ? 404 : 400;
      return reply.status(status).send(result);
    }
    return reply.send(result);
  });

  /** DELETE /:id — Permanently delete a comment. */
  app.delete('/:id', {
    preHandler: [require_auth, require_capability('comment:moderate')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await comment_service.delete(id);
    if (!result.success) return reply.status(404).send(result);
    return reply.send(result);
  });
}

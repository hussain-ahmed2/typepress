/**
 * Content Routes — HTTP handlers for content CRUD.
 *
 * Read endpoints are public (no auth required).
 * Write endpoints require authentication + capability checks.
 * All inputs are validated with Zod before reaching the service layer.
 */
import type { FastifyInstance } from 'fastify';
import { validate_body, validate_query, require_auth, require_capability, require_any_capability } from '../../infrastructure/middleware';
import { create_content_schema, update_content_schema, list_content_schema } from './content.validators';
import { ContentService } from './content.service';
import type { AuthenticatedRequest } from '../../infrastructure/middleware';

const default_content_service = new ContentService();

export async function content_routes(app: FastifyInstance, opts?: { service?: ContentService }) {
  const content_service = opts?.service ?? default_content_service;
  /** GET / — List content with pagination and filtering */
  app.get('/', {
    preHandler: [validate_query(list_content_schema)],
  }, async (request, reply) => {
    const result = await content_service.list(request.query as never);
    return reply.send(result);
  });

  /** GET /:id — Get content by ID */
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await content_service.get_by_id(id);

    if (!result.success) {
      return reply.status(404).send(result);
    }

    return reply.send(result);
  });

  /** GET /slug/:slug — Get content by slug (used by public renderer) */
  app.get('/slug/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const result = await content_service.get_by_slug(slug);

    if (!result.success) {
      return reply.status(404).send(result);
    }

    return reply.send(result);
  });

  /** POST / — Create new content (requires content:create) */
  app.post('/', {
    preHandler: [require_auth, require_capability('content:create'), validate_body(create_content_schema)],
  }, async (request, reply) => {
    const user_id = (request as AuthenticatedRequest).user_id;
    const actor = { user_id, capabilities: request.capabilities ?? [] };
    const result = await content_service.create(request.body as never, user_id, actor);

    if (!result.success) {
      const status = result.error?.code === 'FORBIDDEN' ? 403 : 400;
      return reply.status(status).send(result);
    }

    return reply.status(201).send(result);
  });

  /** PUT /:id — Update content (requires content:edit:any or content:edit:own + ownership). */
  app.put('/:id', {
    preHandler: [require_auth, require_any_capability(['content:edit:any', 'content:edit:own']), validate_body(update_content_schema)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const actor = { user_id: (request as AuthenticatedRequest).user_id, capabilities: request.capabilities ?? [] };
    const result = await content_service.update(id, request.body as never, actor);

    if (!result.success) {
      const status = result.error?.code === 'FORBIDDEN' ? 403 : result.error?.code === 'NOT_FOUND' ? 404 : 400;
      return reply.status(status).send(result);
    }

    return reply.send(result);
  });

  /** DELETE /:id — Soft delete (requires content:edit:any or content:edit:own + ownership). */
  app.delete('/:id', {
    preHandler: [require_auth, require_any_capability(['content:edit:any', 'content:edit:own'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const actor = { user_id: (request as AuthenticatedRequest).user_id, capabilities: request.capabilities ?? [] };
    const result = await content_service.delete(id, actor);

    if (!result.success) {
      const status = result.error?.code === 'FORBIDDEN' ? 403 : result.error?.code === 'NOT_FOUND' ? 404 : 400;
      return reply.status(status).send(result);
    }

    return reply.send(result);
  });
}

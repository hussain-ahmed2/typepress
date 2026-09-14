/**
 * Content Routes — HTTP handlers for content CRUD.
 *
 * Read endpoints are public (no auth required).
 * Write endpoints (POST, PUT, DELETE) require authentication.
 * All inputs are validated with Zod before reaching the service layer.
 */
import type { FastifyInstance } from 'fastify';
import { validate_body, validate_query, require_auth } from '../../infrastructure/middleware';
import { create_content_schema, update_content_schema, list_content_schema } from './content.validators';
import { ContentService } from './content.service';
import type { AuthenticatedRequest } from '../../infrastructure/middleware';

const content_service = new ContentService();

export async function content_routes(app: FastifyInstance) {
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

  /** POST / — Create new content (auth required) */
  app.post('/', {
    preHandler: [require_auth, validate_body(create_content_schema)],
  }, async (request, reply) => {
    const user_id = (request as AuthenticatedRequest).user_id;
    const result = await content_service.create(request.body as never, user_id);

    if (!result.success) {
      return reply.status(400).send(result);
    }

    return reply.status(201).send(result);
  });

  /** PUT /:id — Update content (auth required) */
  app.put('/:id', {
    preHandler: [require_auth, validate_body(update_content_schema)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await content_service.update(id, request.body as never);

    if (!result.success) {
      return reply.status(400).send(result);
    }

    return reply.send(result);
  });

  /** DELETE /:id — Soft delete (move to trash, auth required) */
  app.delete('/:id', {
    preHandler: [require_auth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await content_service.delete(id);

    if (!result.success) {
      return reply.status(404).send(result);
    }

    return reply.send(result);
  });
}

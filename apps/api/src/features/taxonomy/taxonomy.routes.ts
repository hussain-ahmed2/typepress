/**
 * Taxonomy Routes — HTTP handlers for taxonomy CRUD.
 *
 * Read endpoints are public. Write endpoints require authentication.
 */
import type { FastifyInstance } from 'fastify';
import { validate_body, validate_query, require_auth } from '../../infrastructure/middleware';
import { create_taxonomy_schema, update_taxonomy_schema, list_taxonomy_schema } from './taxonomy.validators';
import { TaxonomyService } from './taxonomy.service';

const taxonomy_service = new TaxonomyService();

export async function taxonomy_routes(app: FastifyInstance) {
  /** GET / — List taxonomies, optionally filtered by ?type=category */
  app.get('/', {
    preHandler: [validate_query(list_taxonomy_schema)],
  }, async (request, reply) => {
    const result = await taxonomy_service.list(request.query as never);
    return reply.send(result);
  });

  /** GET /:id — Get taxonomy by ID */
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await taxonomy_service.get_by_id(id);

    if (!result.success) {
      return reply.status(404).send(result);
    }

    return reply.send(result);
  });

  /** POST / — Create taxonomy (auth required) */
  app.post('/', {
    preHandler: [require_auth, validate_body(create_taxonomy_schema)],
  }, async (request, reply) => {
    const result = await taxonomy_service.create(request.body as never);

    if (!result.success) {
      return reply.status(400).send(result);
    }

    return reply.status(201).send(result);
  });

  /** PUT /:id — Update taxonomy (auth required) */
  app.put('/:id', {
    preHandler: [require_auth, validate_body(update_taxonomy_schema)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await taxonomy_service.update(id, request.body as never);

    if (!result.success) {
      return reply.status(400).send(result);
    }

    return reply.send(result);
  });

  /** DELETE /:id — Delete taxonomy (auth required) */
  app.delete('/:id', {
    preHandler: [require_auth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await taxonomy_service.delete(id);

    if (!result.success) {
      return reply.status(404).send(result);
    }

    return reply.send(result);
  });
}

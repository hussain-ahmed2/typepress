import type { FastifyInstance } from 'fastify';
import { validate_body, require_auth } from '../../infrastructure/middleware';
import { create_menu_schema, update_menu_schema, create_menu_item_schema } from './menu.validators';
import { MenuService } from './menu.service';
import '../../types';

const menu_service = new MenuService();

export async function menu_routes(app: FastifyInstance) {
  app.get('/', async (_request, reply) => {
    const result = await menu_service.list();
    return reply.send(result);
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await menu_service.get_by_id(id);
    if (!result.success) return reply.status(404).send(result);
    return reply.send(result);
  });

  app.post('/', {
    preHandler: [require_auth, validate_body(create_menu_schema)],
  }, async (request, reply) => {
    const result = await menu_service.create(request.body as never);
    if (!result.success) return reply.status(400).send(result);
    return reply.status(201).send(result);
  });

  app.put('/:id', {
    preHandler: [require_auth, validate_body(update_menu_schema)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await menu_service.update(id, request.body as never);
    if (!result.success) return reply.status(400).send(result);
    return reply.send(result);
  });

  app.delete('/:id', {
    preHandler: [require_auth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await menu_service.delete(id);
    if (!result.success) return reply.status(404).send(result);
    return reply.send(result);
  });

  app.post('/:id/items', {
    preHandler: [require_auth, validate_body(create_menu_item_schema)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await menu_service.add_item(id, request.body as never);
    if (!result.success) return reply.status(400).send(result);
    return reply.status(201).send(result);
  });

  app.delete('/items/:id', {
    preHandler: [require_auth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await menu_service.delete_item(id);
    if (!result.success) return reply.status(404).send(result);
    return reply.send(result);
  });
}

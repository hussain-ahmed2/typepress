import type { FastifyInstance } from 'fastify';
import { validate_body, validate_query, require_auth, require_capability } from '../../infrastructure/middleware';
import { update_user_schema, list_users_schema } from './user.validators';
import { UserService } from './user.service';
import '../../types';

const user_service = new UserService();

export async function user_routes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [require_auth, require_capability('users:manage'), validate_query(list_users_schema)],
  }, async (request, reply) => {
    const result = await user_service.list(request.query as never);
    return reply.send(result);
  });

  app.get('/:id', {
    preHandler: [require_auth, require_capability('users:manage')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await user_service.get_by_id(id);
    if (!result.success) return reply.status(404).send(result);
    return reply.send(result);
  });

  app.put('/:id', {
    preHandler: [require_auth, require_capability('users:manage'), validate_body(update_user_schema)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await user_service.update(id, request.body as never);
    if (!result.success) return reply.status(400).send(result);
    return reply.send(result);
  });

  app.delete('/:id', {
    preHandler: [require_auth, require_capability('users:manage')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await user_service.delete(id);
    if (!result.success) return reply.status(404).send(result);
    return reply.send(result);
  });
}

import type { FastifyInstance } from 'fastify';
import { require_auth } from '../../infrastructure/middleware';
import { RevisionService } from './revision.service';
import '../../types';

const revision_service = new RevisionService();

export async function revision_routes(app: FastifyInstance) {
  app.get('/:content_id/revisions', {
    preHandler: [require_auth],
  }, async (request, reply) => {
    const { content_id } = request.params as { content_id: string };
    const result = await revision_service.list_by_content(content_id);
    return reply.send(result);
  });

  app.post('/:content_id/revisions/:revision_id/restore', {
    preHandler: [require_auth],
  }, async (request, reply) => {
    const { revision_id } = request.params as { revision_id: string };
    const result = await revision_service.restore(revision_id);
    if (!result.success) return reply.status(400).send(result);
    return reply.send(result);
  });
}

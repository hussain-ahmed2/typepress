import type { FastifyInstance } from 'fastify';
import { require_auth, require_any_capability } from '../../infrastructure/middleware';
import type { AuthenticatedRequest } from '../../infrastructure/middleware';
import { RevisionService } from './revision.service';
import '../../types';

const default_revision_service = new RevisionService();

export async function revision_routes(app: FastifyInstance, opts?: { service?: RevisionService }) {
  const revision_service = opts?.service ?? default_revision_service;
  app.get('/:content_id/revisions', {
    preHandler: [require_auth],
  }, async (request, reply) => {
    const { content_id } = request.params as { content_id: string };
    const result = await revision_service.list_by_content(content_id);
    return reply.send(result);
  });

  app.post('/:content_id/revisions/:revision_id/restore', {
    preHandler: [require_auth, require_any_capability(['content:edit:any', 'content:edit:own'])],
  }, async (request, reply) => {
    const { revision_id } = request.params as { revision_id: string };
    const actor = { user_id: (request as AuthenticatedRequest).user_id, capabilities: request.capabilities ?? [] };
    const result = await revision_service.restore(revision_id, actor);
    if (!result.success) {
      const status = result.error?.code === 'FORBIDDEN' ? 403 : result.error?.code === 'NOT_FOUND' ? 404 : 400;
      return reply.status(status).send(result);
    }
    return reply.send(result);
  });
}

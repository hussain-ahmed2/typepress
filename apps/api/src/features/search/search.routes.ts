import type { FastifyInstance } from 'fastify';
import { validate_query } from '../../infrastructure/middleware';
import { search_schema } from './search.validators';
import { SearchService } from './search.service';
import '../../types';

const search_service = new SearchService();

export async function search_routes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [validate_query(search_schema)],
  }, async (request, reply) => {
    const { q, type, page, limit } = request.query as { q: string; type?: string; page: number; limit: number };
    const result = await search_service.search(q, type, page, limit);
    return reply.send(result);
  });
}

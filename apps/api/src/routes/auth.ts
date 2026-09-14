import type { FastifyInstance } from 'fastify';

export async function auth_routes(app: FastifyInstance) {
  app.post('/auth/login', async (_request, reply) => {
    return reply.send({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Auth not implemented yet' },
    });
  });

  app.post('/auth/logout', async (_request, reply) => {
    return reply.send({ success: true });
  });

  app.get('/auth/me', async (_request, reply) => {
    return reply.send({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Auth not implemented yet' },
    });
  });
}

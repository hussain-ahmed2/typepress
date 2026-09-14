import type { FastifyInstance } from 'fastify';
import { health_routes } from './health';
import { content_routes } from './content';
import { auth_routes } from './auth';

export async function register_routes(app: FastifyInstance) {
  await app.register(health_routes);
  await app.register(content_routes, { prefix: '/api' });
  await app.register(auth_routes, { prefix: '/api' });
}

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import { register_routes } from './routes/index';

export async function create_server() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: config.ADMIN_URL,
    credentials: true,
  });

  await register_routes(app);

  return app;
}

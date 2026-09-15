/**
 * Server Factory — Creates and configures the Fastify application.
 *
 * Boot sequence:
 *   1. Create Fastify instance with logging
 *   2. Register CORS, cookies, sessions
 *   3. Register security (helmet, compression, rate limiting)
 *   4. Register error handler and hooks
 *   5. Register all features
 *   6. Load plugins
 *   7. Register GraphQL
 *   8. Initialize Socket.IO, Scheduler, Email
 *   9. RSS, Sitemap, Export/Import routes
 *  10. Health endpoint
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import { config } from './config';
import { register_features } from './features';
import { register_error_handler } from './infrastructure/error_handler';
import { register_hooks } from './infrastructure/hooks_integration';
import { register_rate_limiting } from './infrastructure/rate_limit';
import { register_security } from './infrastructure/security';
import { load_plugins } from './plugin_loader';
import { PluginManager } from '@typepress/core';
import { register_graphql } from './graphql';
import { create_socket_server } from './realtime/socket';
import { scheduler } from './infrastructure/scheduler';
import { rss_generator } from './infrastructure/rss';
import { sitemap_generator } from './infrastructure/sitemap';
import { export_import_service } from './infrastructure/export_import';
import { email_service } from './infrastructure/email_service';
import { require_auth } from './infrastructure/middleware';

export async function create_server() {
  const app = Fastify({ logger: true });

  // --- Infrastructure ---
  await app.register(cors, {
    origin: config.ADMIN_URL,
    credentials: true,
  });

  await app.register(cookie);
  await app.register(session, {
    secret: config.SESSION_SECRET,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  });

  await register_rate_limiting(app);
  await register_security(app);
  register_error_handler(app);
  register_hooks(app);

  // --- Features ---
  await register_features(app);

  // --- Plugins ---
  const plugin_manager = new PluginManager();
  await load_plugins(plugin_manager);

  // --- GraphQL ---
  await register_graphql(app);

  // --- RSS Feed ---
  app.get('/feed', async (_request, reply) => {
    const xml = await rss_generator.generate();
    reply.header('Content-Type', 'application/rss+xml');
    return reply.send(xml);
  });

  app.get('/feed/:type', async (request, reply) => {
    const { type } = request.params as { type: string };
    const xml = await rss_generator.generate(type);
    reply.header('Content-Type', 'application/rss+xml');
    return reply.send(xml);
  });

  // --- Sitemap ---
  app.get('/sitemap.xml', async (_request, reply) => {
    const xml = await sitemap_generator.generate();
    reply.header('Content-Type', 'application/xml');
    return reply.send(xml);
  });

  // --- Export/Import ---
  app.get('/api/export', {
    preHandler: [require_auth],
  }, async (_request, reply) => {
    const result = await export_import_service.export_all();
    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', 'attachment; filename="typepress-export.json"');
    return reply.send(result.data);
  });

  app.post('/api/import', {
    preHandler: [require_auth],
  }, async (request, reply) => {
    const data = request.body as { version: string; exported_at: string; content: unknown[]; taxonomies: unknown[] };
    const result = await export_import_service.import_data(data);
    return reply.send(result);
  });

  // --- Health check ---
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    plugins: plugin_manager.get_all().map((p) => `${p.name}@${p.version}`),
    features: ['auth', 'content', 'media', 'taxonomy', 'menus', 'users', 'revisions', 'search'],
  }));

  return app;
}

export async function start_server() {
  const app = await create_server();
  await app.listen({ port: config.API_PORT, host: config.API_HOST });
  console.log(`API server running on http://${config.API_HOST}:${config.API_PORT}`);
  create_socket_server(app.server);
  scheduler.start();
  email_service.init();
}

/**
 * Server Factory — Creates and configures the Fastify application.
 *
 * Boot sequence:
 *   1. Create Fastify instance with logging
 *   2. Register CORS, cookies, sessions
 *   3. Register error handler and hooks
 *   4. Register all features
 *   5. Load plugins
 *   6. Register GraphQL
 *   7. Initialize Socket.IO for real-time
 *   8. Health endpoint
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import { config } from './config';
import { register_features } from './features';
import { register_error_handler } from './infrastructure/error_handler';
import { register_hooks } from './infrastructure/hooks_integration';
import { load_plugins } from './plugin_loader';
import { PluginManager } from '@typepress/core';
import { register_graphql } from './graphql';
import { create_socket_server } from './realtime/socket';

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

  register_error_handler(app);
  register_hooks(app);

  // --- Features ---
  await register_features(app);

  // --- Plugins ---
  const plugin_manager = new PluginManager();
  await load_plugins(plugin_manager);

  // --- GraphQL ---
  await register_graphql(app);

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

/**
 * Start the server with Socket.IO.
 * Call this after creating the server to attach real-time capabilities.
 */
export async function start_server() {
  const app = await create_server();

  // Start listening
  await app.listen({ port: config.API_PORT, host: config.API_HOST });
  console.log(`API server running on http://${config.API_HOST}:${config.API_PORT}`);

  // Attach Socket.IO to the underlying HTTP server
  create_socket_server(app.server);
}

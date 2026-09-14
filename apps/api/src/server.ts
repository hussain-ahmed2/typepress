/**
 * Server Factory — Creates and configures the Fastify application.
 *
 * Boot sequence:
 *   1. Create Fastify instance with logging
 *   2. Register CORS (allows admin panel origin)
 *   3. Register cookie + session plugins (for auth)
 *   4. Register global error handler
 *   5. Register request lifecycle hooks
 *   6. Register all features (auth, content, media, taxonomy)
 *   7. Health endpoint (infrastructure, not a feature)
 *
 * The server is a factory function — it returns the configured instance
 * without starting it. The entry point (index.ts) calls listen() separately.
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import { config } from './config';
import { register_features } from './features';
import { register_error_handler } from './infrastructure/error_handler';
import { register_hooks } from './infrastructure/hooks_integration';

export async function create_server() {
  const app = Fastify({ logger: true });

  // --- Infrastructure ---
  await app.register(cors, {
    origin: config.ADMIN_URL,
    credentials: true,
  });

  // Cookie + session plugins — required for auth feature
  await app.register(cookie);
  await app.register(session, {
    secret: config.SESSION_SECRET,
    cookie: {
      secure: false, // Set true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  });

  register_error_handler(app);
  register_hooks(app);

  // --- Health check (not a feature — this is infrastructure) ---
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  // --- Features ---
  await register_features(app);

  return app;
}

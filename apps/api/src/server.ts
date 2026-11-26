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
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
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
import { create_redis_session_store, MemorySessionStore } from './infrastructure/session_store';
import { load_plugins } from './plugin_loader';
import { PluginManager } from '@typepress/core';
import { register_graphql } from './graphql';
import { create_socket_server } from './realtime/socket';
import { scheduler } from './infrastructure/scheduler';
import { rss_generator } from './infrastructure/rss';
import { sitemap_generator } from './infrastructure/sitemap';
import { export_import_service, import_payload_schema } from './infrastructure/export_import';
import type { ImportPayload } from './infrastructure/export_import';
import { email_service } from './infrastructure/email_service';
import { attach_session_user, require_auth, require_capability, require_csrf, validate_body } from './infrastructure/middleware';
import { resolve_local_storage_path } from './infrastructure/storage';

export async function create_server() {
  const app = Fastify({ logger: true });

  // --- Infrastructure ---
  await app.register(cors, {
    origin: config.ADMIN_URL,
    credentials: true,
  });

  await app.register(cookie);

  const session_cookie = {
    secure: config.SESSION_COOKIE_SECURE ?? config.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 24 * 60 * 60 * 1000,
  };

  let session_redis: Awaited<ReturnType<typeof create_redis_session_store>>['redis'] | undefined;
  if (config.SESSION_STORE === 'redis') {
    const redis_session = await create_redis_session_store({ url: config.REDIS_URL });
    session_redis = redis_session.redis;
    app.addHook('onClose', async () => {
      if (session_redis && session_redis.status !== 'end') {
        await session_redis.quit();
      }
    });
    app.sessionStore = redis_session.store;
    await app.register(session, {
      secret: config.SESSION_SECRET,
      cookieName: config.SESSION_COOKIE_NAME,
      store: redis_session.store,
      cookie: session_cookie,
    });
    app.log.info('Session store: redis');
  } else {
    if (config.NODE_ENV === 'production') {
      app.log.warn('Session store: memory (not recommended for production/multi-instance)');
    } else {
      app.log.info('Session store: memory');
    }
    const memory_store = new MemorySessionStore();
    app.sessionStore = memory_store;
    await app.register(session, {
      secret: config.SESSION_SECRET,
      cookieName: config.SESSION_COOKIE_NAME,
      store: memory_store,
      cookie: session_cookie,
    });
  }

  app.addHook('preHandler', attach_session_user);
  app.addHook('preHandler', require_csrf);

  await register_rate_limiting(app);
  await register_security(app);
  register_error_handler(app);
  register_hooks(app);

  // --- Features ---
  await register_features(app);

  // --- Plugins ---
  const plugin_manager = new PluginManager();
  await load_plugins(plugin_manager, app);

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
  // Admin-only: export/import are high-privilege data operations (settings:manage).
  app.get('/api/export', {
    preHandler: [require_auth, require_capability('settings:manage')],
  }, async (request, reply) => {
    const user_id = request.user_id;
    request.log.info({ event: 'export.started', user_id }, 'Content export started');
    const result = await export_import_service.export_all();
    request.log.info(
      { event: 'export.completed', user_id, content_count: result.data?.content.length ?? 0, taxonomy_count: result.data?.taxonomies.length ?? 0 },
      'Content export completed',
    );
    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', 'attachment; filename="typepress-export.json"');
    return reply.send(result.data);
  });

  app.post('/api/import', {
    preHandler: [require_auth, require_capability('settings:manage'), validate_body(import_payload_schema)],
  }, async (request, reply) => {
    const user_id = request.user_id as string;
    const data = request.body as ImportPayload;
    request.log.info(
      { event: 'import.started', user_id, content_count: data.content.length, taxonomy_count: data.taxonomies.length },
      'Content import started',
    );

    const result = await export_import_service.import_data(data, user_id);

    if (!result.success) {
      request.log.warn({ event: 'import.failed', user_id, error: result.error }, 'Content import failed');
      const status = result.error?.code === 'UNAUTHORIZED' ? 401 : 400;
      return reply.status(status).send(result);
    }

    request.log.info(
      {
        event: 'import.completed',
        user_id,
        content_imported: result.data?.content_imported ?? 0,
        taxonomies_imported: result.data?.taxonomies_imported ?? 0,
        authors_remapped: result.data?.authors_remapped ?? 0,
        error_count: result.data?.errors.length ?? 0,
      },
      'Content import completed',
    );
    return reply.send(result);
  });

  // --- Local media file serving (dev/default local storage driver) ---
  if (config.STORAGE_DRIVER === 'local' && config.STORAGE_PUBLIC_URL.startsWith('/')) {
    const uploads_base_path = resolve_local_storage_path(config.STORAGE_LOCAL_PATH);
    const public_base = config.STORAGE_PUBLIC_URL.replace(/\/+$/, '');

    app.get(`${public_base}/*`, async (request, reply) => {
      const wildcard = (request.params as { '*': string })['*'] ?? '';
      const safe_relative_path = normalize_public_file_path(wildcard);
      if (!safe_relative_path) {
        return reply.status(400).send({ success: false, error: { code: 'INVALID_PATH', message: 'Invalid file path' } });
      }

      const file_path = path.resolve(uploads_base_path, safe_relative_path);
      const base_with_sep = uploads_base_path.endsWith(path.sep)
        ? uploads_base_path
        : `${uploads_base_path}${path.sep}`;
      if (file_path !== uploads_base_path && !file_path.startsWith(base_with_sep)) {
        return reply.status(400).send({ success: false, error: { code: 'INVALID_PATH', message: 'Invalid file path' } });
      }

      try {
        const file_stat = await stat(file_path);
        if (!file_stat.isFile()) {
          return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
        }

        reply.header('Content-Type', get_content_type_for_path(file_path));
        return reply.send(createReadStream(file_path));
      } catch {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
      }
    });
  }

  // --- Health check ---
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    plugins: plugin_manager.get_all().map((p) => `${p.name}@${p.version}`),
    plugin_details: plugin_manager.get_records().map((record) => ({
      name: record.name,
      version: record.version,
      status: record.status,
      ...(record.description ? { description: record.description } : {}),
      ...(record.author ? { author: record.author } : {}),
      ...(record.admin ? { admin: record.admin } : {}),
      ...(record.error ? { error: record.error } : {}),
    })),
    features: ['auth', 'content', 'media', 'taxonomy', 'menus', 'users', 'revisions', 'search', 'settings', 'comments', 'plugins'],
  }));

  return app;
}

function normalize_public_file_path(raw_path: string): string | null {
  try {
    const decoded = decodeURIComponent(raw_path);
    const normalized = decoded.replace(/\\/g, '/').replace(/^\/+/, '');
    if (normalized.length === 0) return null;
    const segments = normalized.split('/').filter((segment) => segment.length > 0);
    if (segments.some((segment) => segment === '.' || segment === '..')) return null;
    return segments.join('/');
  } catch {
    return null;
  }
}

function get_content_type_for_path(file_path: string): string {
  const ext = path.extname(file_path).toLowerCase();
  const content_types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
  };
  return content_types[ext] ?? 'application/octet-stream';
}

export async function start_server() {
  const app = await create_server();
  await app.listen({ port: config.API_PORT, host: config.API_HOST });
  app.log.info(`API server running on http://${config.API_HOST}:${config.API_PORT}`);
  create_socket_server(app.server, app);
  scheduler.start();
  email_service.init();
}

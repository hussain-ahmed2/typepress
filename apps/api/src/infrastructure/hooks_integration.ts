/**
 * Hooks Integration — Bridges Fastify's request lifecycle with Typepress's hook system.
 *
 * Fires custom hooks at key points so features and plugins can tap into
 * the request/response cycle without modifying route handlers.
 *
 * Hook naming convention: "feature:action"
 *   - api:request_received — fires on every incoming request
 *   - api:response_sent — fires after every response is sent
 *   - content:before_create — fires before content is created
 *   - content:after_create — fires after content is created
 *
 * Features subscribe to these hooks during registration:
 *   context.hooks.on('content:after_create', async (content) => { ... });
 */
import type { FastifyInstance } from 'fastify';
import { hooks } from '@typepress/core';

export function register_hooks(app: FastifyInstance): void {
  app.addHook('onRequest', async (request) => {
    await hooks.emit('api:request_received', {
      method: request.method,
      url: request.url,
      ip: request.ip,
    });
  });

  app.addHook('onSend', async (_request, reply, payload) => {
    await hooks.emit('api:response_sent', {
      status_code: reply.statusCode,
    });
    return payload;
  });
}

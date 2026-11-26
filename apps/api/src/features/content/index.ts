/**
 * Content Feature — Core content management (posts, pages, custom types).
 *
 * Endpoints:
 *   GET    /api/content          — List with pagination, filtering by type/status
 *   GET    /api/content/:id      — Single content by ID with taxonomies
 *   GET    /api/content/slug/:slug — Single content by slug (for public rendering)
 *   POST   /api/content          — Create new content (auth required)
 *   PUT    /api/content/:id      — Update existing content (auth required)
 *   DELETE /api/content/:id      — Soft delete (move to trash)
 *
 * Content uses a generic model: type (string) + JSONB meta for flexibility.
 * Plugins can register new content types by using different `type` values.
 */
import type { FastifyInstance } from 'fastify';
import type { FeatureContext, FeaturePlugin } from '@typepress/core';
import { content_routes } from './content.routes';
import { ContentService } from './content.service';

export const content_feature: FeaturePlugin = {
  name: 'content',
  version: '0.1.0',
  dependencies: ['auth'],

  async register(app: FastifyInstance, context: FeatureContext) {
    const content_service = new ContentService(context.hooks);
    await app.register(content_routes, { service: content_service });
  },
};

/**
 * Media Feature — File upload and management.
 *
 * Endpoints:
 *   GET    /api/media          — List uploaded media with pagination
 *   POST   /api/media/upload   — Upload a file (multipart/form-data)
 *   DELETE /api/media/:id      — Delete a media item
 *
 * Currently stores metadata only with placeholder URLs.
 * MinIO integration will replace the placeholder when available.
 */
import type { FastifyInstance } from 'fastify';
import type { FeaturePlugin } from '@typepress/core';
import { media_routes } from './media.routes';

export const media_feature: FeaturePlugin = {
  name: 'media',
  version: '0.1.0',
  dependencies: ['auth'],

  async register(app: FastifyInstance) {
    await app.register(media_routes);
  },
};

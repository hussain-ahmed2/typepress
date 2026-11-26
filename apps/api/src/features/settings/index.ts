/**
 * Settings Feature — Site configuration persistence.
 *
 * Endpoints:
 *   GET /api/settings — Get site settings (admin)
 *   PUT /api/settings — Update site settings (admin)
 */
import type { FastifyInstance } from 'fastify';
import type { FeaturePlugin } from '@typepress/core';
import { settings_routes } from './settings.routes';

export const settings_feature: FeaturePlugin = {
  name: 'settings',
  version: '0.1.0',
  dependencies: ['auth'],

  async register(app: FastifyInstance) {
    await app.register(settings_routes);
  },
};

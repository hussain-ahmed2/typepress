/**
 * Plugins Feature — Admin plugin state management.
 *
 * Endpoints:
 *   GET   /api/plugins      — List discovered plugins and their state
 *   PATCH /api/plugins/:name — Enable/disable a plugin (persisted)
 */
import type { FastifyInstance } from 'fastify';
import type { FeaturePlugin } from '@typepress/core';
import { plugins_routes } from './plugins.routes';

export const plugins_feature: FeaturePlugin = {
  name: 'plugins',
  version: '0.1.0',
  dependencies: ['auth'],

  async register(app: FastifyInstance): Promise<void> {
    await app.register(plugins_routes);
  },
};

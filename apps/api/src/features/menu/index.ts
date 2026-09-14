import type { FastifyInstance } from 'fastify';
import type { FeaturePlugin } from '@typepress/core';
import { menu_routes } from './menu.routes';

export const menu_feature: FeaturePlugin = {
  name: 'menus',
  version: '0.1.0',
  dependencies: ['auth'],

  async register(app: FastifyInstance) {
    await app.register(menu_routes);
  },
};

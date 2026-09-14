import type { FastifyInstance } from 'fastify';
import type { FeaturePlugin } from '@typepress/core';
import { user_routes } from './user.routes';

export const user_feature: FeaturePlugin = {
  name: 'users',
  version: '0.1.0',
  dependencies: ['auth'],

  async register(app: FastifyInstance) {
    await app.register(user_routes);
  },
};

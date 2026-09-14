import type { FastifyInstance } from 'fastify';
import type { FeaturePlugin } from '@typepress/core';
import { search_routes } from './search.routes';

export const search_feature: FeaturePlugin = {
  name: 'search',
  version: '0.1.0',
  dependencies: [],

  async register(app: FastifyInstance) {
    await app.register(search_routes);
  },
};

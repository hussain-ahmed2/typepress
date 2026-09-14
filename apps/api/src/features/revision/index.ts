import type { FastifyInstance } from 'fastify';
import type { FeaturePlugin } from '@typepress/core';
import { revision_routes } from './revision.routes';

export const revision_feature: FeaturePlugin = {
  name: 'revisions',
  version: '0.1.0',
  dependencies: ['auth', 'content'],

  async register(app: FastifyInstance) {
    await app.register(revision_routes, { prefix: '/api/content' });
  },
};

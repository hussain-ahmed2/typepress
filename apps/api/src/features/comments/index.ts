/**
 * Comments Feature — Public comment creation and admin moderation.
 */
import type { FastifyInstance } from 'fastify';
import type { FeaturePlugin } from '@typepress/core';
import { comment_routes } from './comment.routes';

export const comments_feature: FeaturePlugin = {
  name: 'comments',
  version: '0.1.0',
  dependencies: ['auth', 'content'],

  async register(app: FastifyInstance) {
    await app.register(comment_routes);
  },
};

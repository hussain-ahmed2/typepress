/**
 * Taxonomy Feature — Categories, tags, and custom taxonomies.
 *
 * Endpoints:
 *   GET    /api/taxonomy      — List taxonomies, optionally filtered by type
 *   GET    /api/taxonomy/:id  — Get taxonomy by ID with children
 *   POST   /api/taxonomy      — Create taxonomy (auth required)
 *   PUT    /api/taxonomy/:id  — Update taxonomy (auth required)
 *   DELETE /api/taxonomy/:id  — Delete taxonomy (auth required)
 *
 * Taxonomies support hierarchical structures via parent_id (self-referential).
 * The `type` field is a free string — "category", "tag", "genre", etc.
 */
import type { FastifyInstance } from 'fastify';
import type { FeaturePlugin } from '@typepress/core';
import { taxonomy_routes } from './taxonomy.routes';

export const taxonomy_feature: FeaturePlugin = {
  name: 'taxonomy',
  version: '0.1.0',
  dependencies: [],

  async register(app: FastifyInstance) {
    await app.register(taxonomy_routes);
  },
};

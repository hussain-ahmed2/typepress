/**
 * Feature Registry — Central hub that imports and registers all API features.
 *
 * To add a new feature:
 *   1. Create the feature directory under src/features/your_feature/
 *   2. Implement the FeaturePlugin interface
 *   3. Import it here and call feature_registry.register(your_feature)
 *
 * That's it — no existing route files, services, or middleware need modification.
 * The registry handles dependency resolution and route prefixing automatically.
 */
import type { FastifyInstance } from 'fastify';
import { FeatureRegistry, hooks } from '@typepress/core';

import { auth_feature } from './auth';
import { content_feature } from './content';
import { media_feature } from './media';
import { taxonomy_feature } from './taxonomy';
import { menu_feature } from './menu';
import { user_feature } from './user';
import { revision_feature } from './revision';
import { search_feature } from './search';

const feature_registry = new FeatureRegistry();

feature_registry.register(auth_feature);
feature_registry.register(content_feature);
feature_registry.register(media_feature);
feature_registry.register(taxonomy_feature);
feature_registry.register(menu_feature);
feature_registry.register(user_feature);
feature_registry.register(revision_feature);
feature_registry.register(search_feature);

/**
 * Boot all features into the Fastify instance.
 * Each feature gets its own route prefix: /api/{feature_name}
 */
export async function register_features(app: FastifyInstance): Promise<void> {
  for (const feature_name of feature_registry.resolve_order()) {
    const feature = feature_registry.get(feature_name)!;

    await app.register(
      async (instance) => {
        await feature.register(instance, { hooks });
      },
      { prefix: `/api/${feature.name}` },
    );

    app.log.info(`Feature "${feature.name}" v${feature.version} registered`);
  }
}

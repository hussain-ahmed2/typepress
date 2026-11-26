import type { FastifyInstance } from 'fastify';
import type { FeatureContext, FeaturePlugin } from '@typepress/core';
import { revision_routes } from './revision.routes';
import { RevisionService, type RevisionSnapshot } from './revision.service';

/** Mirrors the payload emitted by ContentService before persisting updates. */
interface ContentBeforeUpdatePayload {
  content_id: string;
  actor_id: string;
  snapshot: RevisionSnapshot;
}

export const revision_feature: FeaturePlugin = {
  name: 'revisions',
  version: '0.1.0',
  dependencies: ['auth', 'content'],

  async register(app: FastifyInstance, context: FeatureContext) {
    const revision_service = new RevisionService();

    // Persist a pre-update revision snapshot. Failures must not block content updates.
    context.hooks.on('content:before_update', async (...args: unknown[]) => {
      const payload = args[0] as ContentBeforeUpdatePayload | undefined;
      if (!payload?.content_id || !payload?.actor_id || !payload?.snapshot) return;
      try {
        await revision_service.create(payload.content_id, payload.actor_id, payload.snapshot);
      } catch {
        // Revision persistence is best-effort; content update already validated.
      }
    });

    await app.register(revision_routes, { prefix: '/api/content', service: revision_service });
  },
};

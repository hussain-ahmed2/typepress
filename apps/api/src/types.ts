/**
 * Type Augmentation — Extends Fastify session and request with custom fields.
 *
 * @fastify/session uses a typed Session interface. We augment it to add
 * our user_id field so request.session.set('user_id', ...) works.
 *
 * FastifyRequest.user_id is populated by the session bridge hook so
 * downstream middleware (require_auth, require_capability) can read it.
 */
import 'fastify';
import type { Capability } from '@typepress/shared-types';
import type { SessionStore } from './infrastructure/session_store';

declare module 'fastify' {
  interface Session {
    user_id?: string;
    csrf_token?: string;
  }

  interface FastifyRequest {
    user_id?: string;
    capabilities?: Capability[];
  }

  interface FastifyInstance {
    sessionStore?: SessionStore;
  }
}

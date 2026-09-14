/**
 * Type Augmentation — Extends Fastify's session type with custom fields.
 *
 * @fastify/session uses a typed Session interface. We augment it to add
 * our user_id field so request.session.set('user_id', ...) works.
 */
import 'fastify';

declare module 'fastify' {
  interface Session {
    user_id: string;
  }
}

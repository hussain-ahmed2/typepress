/**
 * Auth Routes — HTTP handlers for authentication endpoints.
 *
 * Uses Zod validation on login body and session management for logout/me.
 * Session types are augmented in types.ts to add user_id to Session interface.
 */
import type { FastifyInstance } from 'fastify';
import { validate_body } from '../../infrastructure/middleware';
import { login_schema } from './auth.validators';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from '../../infrastructure/middleware';
import '../../types';

const auth_service = new AuthService();

export async function auth_routes(app: FastifyInstance) {
  /**
   * POST /login — Authenticate user and create session.
   * Validates email/password format with Zod before processing.
   */
  app.post('/login', {
    preHandler: [validate_body(login_schema)],
  }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };
    const result = await auth_service.login(email, password);

    if (!result.success) {
      return reply.status(401).send(result);
    }

    // Store user_id in session — subsequent requests use this for auth
    request.session.set('user_id', result.data!.user_id);
    return reply.send(result);
  });

  /** POST /logout — Destroy the current session. */
  app.post('/logout', async (request, reply) => {
    await request.session.destroy();
    return reply.send({ success: true, data: { message: 'Logged out' } });
  });

  /** GET /me — Return the current authenticated user's profile. */
  app.get('/me', async (request, reply) => {
    const user_id = (request as AuthenticatedRequest).user_id;

    if (!user_id) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    }

    const result = await auth_service.get_current_user(user_id);
    return reply.send(result);
  });
}

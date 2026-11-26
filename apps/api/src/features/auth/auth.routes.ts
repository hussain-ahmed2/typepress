/**
 * Auth Routes — HTTP handlers for authentication endpoints.
 *
 * Security:
 *   - Zod validation on all inputs
 *   - Session-based auth with secure cookies
 *   - Register endpoint with password validation
 *   - Password reset and email verification use hashed, expiring, single-use tokens
 *   - Generic responses for reset/verification requests to avoid user enumeration
 *   - Per-route rate limits on sensitive auth endpoints
 */
import type { FastifyInstance } from 'fastify';
import { config } from '../../config';
import { email_service } from '../../infrastructure/email_service';
import { get_or_create_csrf_token, validate_body } from '../../infrastructure/middleware';
import {
  forgot_password_schema,
  login_schema,
  register_schema,
  resend_verification_schema,
  reset_password_schema,
  verify_email_schema,
} from './auth.validators';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from '../../infrastructure/middleware';
import '../../types';

const auth_service = new AuthService();

/** Build an admin URL for token-based auth flows. Tokens are hex; encoding is defensive. */
function build_admin_auth_url(path: string, token: string): string {
  const base = config.ADMIN_URL.replace(/\/+$/, '');
  const url = new URL(path, `${base}/`);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function auth_routes(app: FastifyInstance) {
  /** POST /login — Authenticate user and create session. */
  app.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    preHandler: [validate_body(login_schema)],
  }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };
    const result = await auth_service.login(email, password);

    if (!result.success) {
      return reply.status(401).send(result);
    }

    // Regenerate session ID to prevent session fixation
    await request.session.regenerate();
    request.session.user_id = result.data!.user_id;
    const csrf_token = get_or_create_csrf_token(request);

    return reply.send({ ...result, data: { ...result.data!, csrf_token } });
  });

  /** POST /logout — Destroy the current session. */
  app.post('/logout', async (request, reply) => {
    if (request.session?.user_id) {
      await request.session.destroy();
    }
    reply.clearCookie(config.SESSION_COOKIE_NAME, { path: '/' });
    return reply.send({ success: true, data: { message: 'Logged out' } });
  });

  /** GET /csrf — Return a CSRF token for cookie-authenticated state changes. */
  app.get('/csrf', async (request, reply) => {
    const csrf_token = get_or_create_csrf_token(request);
    return reply.send({ success: true, data: { csrf_token } });
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

  /** POST /register — Create a new user account and send verification email. */
  app.post('/register', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    preHandler: [validate_body(register_schema)],
  }, async (request, reply) => {
    const { email, name, password } = request.body as { email: string; name: string; password: string };
    const result = await auth_service.register(email, name, password);

    if (!result.success) {
      return reply.status(400).send(result);
    }

    // Send verification email best-effort; registration should still succeed.
    const verification = await auth_service.create_email_verification_token_for_user(result.data!.user_id);
    if (verification) {
      const verify_url = build_admin_auth_url('/verify-email', verification.raw_token);
      await email_service.send_verification_email(verification.email, verify_url);
    }

    // Auto-login after registration
    await request.session.regenerate();
    request.session.user_id = result.data!.user_id;
    const csrf_token = get_or_create_csrf_token(request);

    return reply.status(201).send({ ...result, data: { ...result.data!, csrf_token } });
  });

  /** POST /forgot-password — Request a password reset email (generic response). */
  app.post('/forgot-password', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    preHandler: [validate_body(forgot_password_schema)],
  }, async (request, reply) => {
    const { email } = request.body as { email: string };
    const token_result = await auth_service.create_password_reset_token(email);

    if (token_result) {
      const reset_url = build_admin_auth_url('/reset-password', token_result.raw_token);
      await email_service.send_password_reset_email(token_result.email, reset_url);
    }

    // Generic response prevents account enumeration.
    return reply.send({
      success: true,
      data: { message: 'If an account with that email exists, a password reset link has been sent.' },
    });
  });

  /** POST /reset-password — Set a new password using a one-time reset token. */
  app.post('/reset-password', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    preHandler: [validate_body(reset_password_schema)],
  }, async (request, reply) => {
    const { token, password } = request.body as { token: string; password: string };
    const result = await auth_service.reset_password(token, password);

    if (!result.success) {
      const status = result.error?.code === 'WEAK_PASSWORD' ? 400 : 401;
      return reply.status(status).send(result);
    }

    if (!result.data) {
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Password reset failed' },
      });
    }

    // Revoke all active sessions after password reset so stolen sessions cannot persist.
    const session_store = request.server.sessionStore;
    if (session_store) {
      try {
        await session_store.destroy_by_user_id(result.data.user_id);
      } catch (error) {
        request.log.error({ err: error, user_id: result.data.user_id }, 'Failed to revoke sessions after password reset');
      }
    } else {
      request.log.warn({ user_id: result.data.user_id }, 'Session store unavailable; skipped session revocation after password reset');
    }

    // Do not expose internal user_id in the public API response.
    return reply.send({ success: true, data: { message: result.data.message } });
  });

  /** POST /verify-email — Verify email address using a one-time token. */
  app.post('/verify-email', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    preHandler: [validate_body(verify_email_schema)],
  }, async (request, reply) => {
    const { token } = request.body as { token: string };
    const result = await auth_service.verify_email(token);

    if (!result.success) {
      return reply.status(401).send(result);
    }

    return reply.send(result);
  });

  /** POST /resend-verification — Send another verification email (generic response). */
  app.post('/resend-verification', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    preHandler: [validate_body(resend_verification_schema)],
  }, async (request, reply) => {
    const { email } = request.body as { email: string };
    const token_result = await auth_service.create_email_verification_token(email);

    if (token_result) {
      const verify_url = build_admin_auth_url('/verify-email', token_result.raw_token);
      await email_service.send_verification_email(token_result.email, verify_url);
    }

    // Generic response prevents account enumeration.
    return reply.send({
      success: true,
      data: { message: 'If an account with that email exists and is not verified, a verification email has been sent.' },
    });
  });
}

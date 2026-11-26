/**
 * Auth Routes Tests — verifies reset/verify/resend flows and session revocation.
 *
 * Uses Fastify injection with mocked AuthService/email service to exercise
 * route behavior, response shaping, and password-reset session invalidation.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import { MemorySessionStore } from '../../infrastructure/session_store';

const mock_auth_service = vi.hoisted(() => ({
  login: vi.fn(),
  get_current_user: vi.fn(),
  register: vi.fn(),
  create_password_reset_token: vi.fn(),
  reset_password: vi.fn(),
  create_email_verification_token: vi.fn(),
  create_email_verification_token_for_user: vi.fn(),
  verify_email: vi.fn(),
}));

vi.mock('./auth.service', () => ({
  AuthService: class {
    login = mock_auth_service.login;
    get_current_user = mock_auth_service.get_current_user;
    register = mock_auth_service.register;
    create_password_reset_token = mock_auth_service.create_password_reset_token;
    reset_password = mock_auth_service.reset_password;
    create_email_verification_token = mock_auth_service.create_email_verification_token;
    create_email_verification_token_for_user = mock_auth_service.create_email_verification_token_for_user;
    verify_email = mock_auth_service.verify_email;
  },
}));

vi.mock('../../infrastructure/email_service', () => ({
  email_service: {
    send_password_reset_email: vi.fn().mockResolvedValue(true),
    send_verification_email: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../../config', () => ({
  config: {
    ADMIN_URL: 'http://localhost:3001',
    SESSION_COOKIE_NAME: 'typepress.sid',
  },
}));

import { auth_routes } from './auth.routes';
import { email_service } from '../../infrastructure/email_service';

const mock_email_service = email_service as unknown as {
  send_password_reset_email: ReturnType<typeof vi.fn>;
  send_verification_email: ReturnType<typeof vi.fn>;
};

async function build_app(session_store?: MemorySessionStore): Promise<FastifyInstance> {
  const app = Fastify();
  const store = session_store ?? new MemorySessionStore();

  await app.register(cookie);
  await app.register(session, {
    secret: 'test-session-secret-test-session-secret',
    cookieName: 'typepress.sid',
    cookie: { secure: false, httpOnly: true, sameSite: 'lax' },
    store,
  });

  app.sessionStore = store;
  await app.register(auth_routes);
  await app.ready();
  return app;
}

describe('auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('revokes existing sessions on successful password reset and hides internal user_id', async () => {
    const session_store = new MemorySessionStore();
    const app = await build_app(session_store);

    await new Promise<void>((resolve) => session_store.set('sid-old', { user_id: 'user-1' } as never, () => resolve()));
    await new Promise<void>((resolve) => session_store.set('sid-other', { user_id: 'user-2' } as never, () => resolve()));

    mock_auth_service.reset_password.mockResolvedValue({
      success: true,
      data: { message: 'Password has been reset successfully', user_id: 'user-1' },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/reset-password',
      payload: { token: 'a'.repeat(64), password: 'NewPassword123' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      success: true,
      data: { message: 'Password has been reset successfully' },
    });

    const old_session = await new Promise<unknown>((resolve) => session_store.get('sid-old', (_err, s) => resolve(s)));
    const other_session = await new Promise<unknown>((resolve) => session_store.get('sid-other', (_err, s) => resolve(s)));
    expect(old_session).toBeNull();
    expect(other_session).toEqual({ user_id: 'user-2' });

    await app.close();
  });

  it('returns validation error for weak password without revoking sessions', async () => {
    const session_store = new MemorySessionStore();
    const app = await build_app(session_store);
    await new Promise<void>((resolve) => session_store.set('sid-old', { user_id: 'user-1' } as never, () => resolve()));

    const response = await app.inject({
      method: 'POST',
      url: '/reset-password',
      payload: { token: 'a'.repeat(64), password: 'weakpassword' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect(mock_auth_service.reset_password).not.toHaveBeenCalled();
    const old_session = await new Promise<unknown>((resolve) => session_store.get('sid-old', (_err, s) => resolve(s)));
    expect(old_session).toEqual({ user_id: 'user-1' });

    await app.close();
  });

  it('sends verification email for resend requests when service returns token', async () => {
    const app = await build_app();
    mock_auth_service.create_email_verification_token.mockResolvedValue({
      raw_token: 'b'.repeat(64),
      email: 'user@example.com',
      name: 'User',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/resend-verification',
      payload: { email: 'user@example.com' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      success: true,
      data: { message: 'If an account with that email exists and is not verified, a verification email has been sent.' },
    });
    expect(mock_email_service.send_verification_email).toHaveBeenCalledWith(
      'user@example.com',
      'http://localhost:3001/verify-email?token=' + 'b'.repeat(64),
    );

    await app.close();
  });

  it('returns generic resend response when no token is created', async () => {
    const app = await build_app();
    mock_auth_service.create_email_verification_token.mockResolvedValue(null);

    const response = await app.inject({
      method: 'POST',
      url: '/resend-verification',
      payload: { email: 'missing@example.com' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);
    expect(mock_email_service.send_verification_email).not.toHaveBeenCalled();

    await app.close();
  });

  it('verifies email through token endpoint', async () => {
    const app = await build_app();
    mock_auth_service.verify_email.mockResolvedValue({
      success: true,
      data: { message: 'Email verified successfully' },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/verify-email',
      payload: { token: 'c'.repeat(64) },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true, data: { message: 'Email verified successfully' } });
    expect(mock_auth_service.verify_email).toHaveBeenCalledWith('c'.repeat(64));

    await app.close();
  });

  it('returns 401 for invalid verification token', async () => {
    const app = await build_app();
    mock_auth_service.verify_email.mockResolvedValue({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Verification token is invalid or has expired' },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/verify-email',
      payload: { token: 'bad-token' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('INVALID_TOKEN');

    await app.close();
  });

  it('returns generic forgot-password response and sends email when token created', async () => {
    const app = await build_app();
    mock_auth_service.create_password_reset_token.mockResolvedValue({
      raw_token: 'd'.repeat(64),
      email: 'user@example.com',
      name: 'User',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/forgot-password',
      payload: { email: 'user@example.com' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.message).toContain('If an account with that email exists');
    expect(mock_email_service.send_password_reset_email).toHaveBeenCalledWith(
      'user@example.com',
      'http://localhost:3001/reset-password?token=' + 'd'.repeat(64),
    );

    await app.close();
  });
});

/**
 * CSRF Middleware Tests — token validation and policy enforcement.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import { get_or_create_csrf_token, require_csrf } from './csrf.middleware';

const ORIGINAL_ENV = { ...process.env };

async function build_test_app(): Promise<FastifyInstance> {
  const app = Fastify();

  await app.register(cookie);
  await app.register(session, {
    secret: 'test-session-secret-test-session-secret',
    cookieName: 'typepress.sid',
    cookie: { secure: false, httpOnly: true, sameSite: 'lax' },
  });

  app.addHook('preHandler', require_csrf);

  app.get('/api/auth/csrf', async (request, reply) => {
    const csrf_token = get_or_create_csrf_token(request);
    return reply.send({ success: true, data: { csrf_token } });
  });

  app.post('/api/auth/login', async () => ({ success: true }));
  app.post('/api/auth/register', async () => ({ success: true }));
  app.post('/api/auth/logout', async () => ({ success: true }));
  app.post('/api/auth/forgot-password', async () => ({ success: true }));
  app.post('/api/auth/reset-password', async () => ({ success: true }));
  app.post('/api/auth/verify-email', async () => ({ success: true }));
  app.post('/api/auth/resend-verification', async () => ({ success: true }));

  app.get('/api/content', async () => ({ success: true, data: [] }));
  app.post('/api/content', async () => ({ success: true, data: { id: '1' } }));
  app.put('/api/content/1', async () => ({ success: true }));
  app.patch('/api/content/1', async () => ({ success: true }));
  app.delete('/api/content/1', async () => ({ success: true }));
  app.post('/api/graphql', async () => ({ data: { __typename: 'Query' } }));

  await app.ready();
  return app;
}

function get_cookie_header(response: { cookies: Array<{ name: string; value: string }>; headers: Record<string, unknown> }): string {
  const cookies = response.cookies;
  if (Array.isArray(cookies) && cookies.length > 0) {
    return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  }

  const set_cookie = response.headers['set-cookie'];
  const values = Array.isArray(set_cookie) ? set_cookie : set_cookie ? [String(set_cookie)] : [];
  return values.map((entry) => entry.split(';')[0]).join('; ');
}

describe('require_csrf', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV, CSRF_PROTECTION: 'true', NODE_ENV: 'test' };
    delete process.env.CSRF_ORIGIN_CHECK;
    delete process.env.CSRF_TRUSTED_ORIGINS;
    delete process.env.ADMIN_URL;
    app = await build_test_app();
  });

  afterEach(async () => {
    await app.close();
    process.env = { ...ORIGINAL_ENV };
  });

  it('allows safe methods without a CSRF token', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/content' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true, data: [] });
  });

  it('allows exempt auth paths without a CSRF token', async () => {
    for (const path of [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/logout',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/verify-email',
      '/api/auth/resend-verification',
    ]) {
      const response = await app.inject({ method: 'POST', url: path });
      expect(response.statusCode, path).toBe(200);
    }
  });

  it('allows CSRF token bootstrap endpoint', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/auth/csrf' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(typeof body.data.csrf_token).toBe('string');
    expect(body.data.csrf_token.length).toBeGreaterThan(0);
  });

  it('rejects mutating request without CSRF token', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/content' });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      success: false,
      error: { code: 'CSRF_TOKEN_MISSING', message: 'CSRF session token missing' },
    });
  });

  it('rejects mutating request with invalid CSRF token', async () => {
    const csrf_response = await app.inject({ method: 'GET', url: '/api/auth/csrf' });
    const cookie_header = get_cookie_header(csrf_response);

    const response = await app.inject({
      method: 'POST',
      url: '/api/content',
      headers: {
        cookie: cookie_header,
        'x-csrf-token': 'invalid-token',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      success: false,
      error: { code: 'CSRF_TOKEN_INVALID', message: 'Invalid CSRF token' },
    });
  });

  it('allows mutating request with valid CSRF token', async () => {
    const csrf_response = await app.inject({ method: 'GET', url: '/api/auth/csrf' });
    const cookie_header = get_cookie_header(csrf_response);
    const csrf_token = csrf_response.json().data.csrf_token as string;

    const response = await app.inject({
      method: 'POST',
      url: '/api/content',
      headers: {
        cookie: cookie_header,
        'x-csrf-token': csrf_token,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true, data: { id: '1' } });
  });

  it('covers mutating methods and GraphQL POST', async () => {
    const csrf_response = await app.inject({ method: 'GET', url: '/api/auth/csrf' });
    const cookie_header = get_cookie_header(csrf_response);
    const csrf_token = csrf_response.json().data.csrf_token as string;

    const cases = [
      { method: 'PUT' as const, url: '/api/content/1' },
      { method: 'PATCH' as const, url: '/api/content/1' },
      { method: 'DELETE' as const, url: '/api/content/1' },
      { method: 'POST' as const, url: '/api/graphql' },
    ];

    for (const test_case of cases) {
      const blocked = await app.inject({ method: test_case.method, url: test_case.url });
      expect(blocked.statusCode, `${test_case.method} ${test_case.url} without token`).toBe(403);

      const allowed = await app.inject({
        method: test_case.method,
        url: test_case.url,
        headers: { cookie: cookie_header, 'x-csrf-token': csrf_token },
      });
      expect(allowed.statusCode, `${test_case.method} ${test_case.url} with token`).toBe(200);
    }
  });

  it('rejects mutating request when origin is untrusted', async () => {
    process.env.ADMIN_URL = 'https://admin.example.com';
    process.env.CSRF_ORIGIN_CHECK = 'true';

    const csrf_response = await app.inject({ method: 'GET', url: '/api/auth/csrf' });
    const cookie_header = get_cookie_header(csrf_response);
    const csrf_token = csrf_response.json().data.csrf_token as string;

    const response = await app.inject({
      method: 'POST',
      url: '/api/content',
      headers: {
        cookie: cookie_header,
        'x-csrf-token': csrf_token,
        origin: 'https://evil.example.com',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      success: false,
      error: { code: 'CSRF_ORIGIN_INVALID', message: 'Invalid request origin' },
    });
  });

  it('allows mutating request when origin is trusted', async () => {
    process.env.ADMIN_URL = 'https://admin.example.com';
    process.env.CSRF_ORIGIN_CHECK = 'true';

    const csrf_response = await app.inject({ method: 'GET', url: '/api/auth/csrf' });
    const cookie_header = get_cookie_header(csrf_response);
    const csrf_token = csrf_response.json().data.csrf_token as string;

    const response = await app.inject({
      method: 'POST',
      url: '/api/content',
      headers: {
        cookie: cookie_header,
        'x-csrf-token': csrf_token,
        origin: 'https://admin.example.com',
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it('can be disabled by CSRF_PROTECTION=false', async () => {
    process.env.CSRF_PROTECTION = 'false';

    const response = await app.inject({ method: 'POST', url: '/api/content' });

    expect(response.statusCode).toBe(200);
  });
});

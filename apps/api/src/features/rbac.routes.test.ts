/**
 * RBAC Route Enforcement Tests — verifies write endpoints require capabilities.
 *
 * These tests register real route handlers in Fastify with mocked services.
 * The auth/capability preHandlers are exercised through HTTP injection.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

vi.mock('@typepress/db', () => ({
  db: {
    select: vi.fn(),
  },
  users: { __table: 'users' },
}));

vi.mock('@typepress/core', () => ({
  CapabilityChecker: class {
    private readonly capabilities: string[];
    constructor(capabilities: string[]) {
      this.capabilities = capabilities;
    }
    has(capability: string): boolean {
      return this.capabilities.includes(capability);
    }
  },
}));

vi.mock('./content/content.service', () => ({
  ContentService: class {
    create = vi.fn().mockResolvedValue({ success: true, data: { id: '1' } });
    update = vi.fn().mockResolvedValue({ success: true, data: { id: '1' } });
    delete = vi.fn().mockResolvedValue({ success: true });
    list = vi.fn().mockResolvedValue({ success: true, data: [], pagination: {} });
    get_by_id = vi.fn().mockResolvedValue({ success: true, data: { id: '1' } });
    get_by_slug = vi.fn().mockResolvedValue({ success: true, data: { id: '1' } });
  },
}));

vi.mock('./media/media.service', () => ({
  MAX_UPLOAD_BYTES: 10 * 1024 * 1024,
  MediaService: class {
    upload_file = vi.fn().mockResolvedValue({ success: true, data: { id: '1' } });
    delete = vi.fn().mockResolvedValue({ success: true });
    list = vi.fn().mockResolvedValue({ success: true, data: [], pagination: {} });
  },
}));

vi.mock('./taxonomy/taxonomy.service', () => ({
  TaxonomyService: class {
    create = vi.fn().mockResolvedValue({ success: true, data: { id: '1' } });
    update = vi.fn().mockResolvedValue({ success: true, data: { id: '1' } });
    delete = vi.fn().mockResolvedValue({ success: true });
    list = vi.fn().mockResolvedValue({ success: true, data: [] });
    get_by_id = vi.fn().mockResolvedValue({ success: true, data: { id: '1' } });
  },
}));

vi.mock('./menu/menu.service', () => ({
  MenuService: class {
    create = vi.fn().mockResolvedValue({ success: true, data: { id: '1' } });
    update = vi.fn().mockResolvedValue({ success: true, data: { id: '1' } });
    delete = vi.fn().mockResolvedValue({ success: true });
    add_item = vi.fn().mockResolvedValue({ success: true, data: { id: '1' } });
    delete_item = vi.fn().mockResolvedValue({ success: true });
    list = vi.fn().mockResolvedValue({ success: true, data: [] });
    get_by_id = vi.fn().mockResolvedValue({ success: true, data: { id: '1' } });
  },
}));

vi.mock('./revision/revision.service', () => ({
  RevisionService: class {
    list_by_content = vi.fn().mockResolvedValue({ success: true, data: [] });
    restore = vi.fn().mockResolvedValue({ success: true, data: { id: '1' } });
  },
}));

import { db } from '@typepress/db';
import { content_routes } from './content/content.routes';
import { media_routes } from './media/media.routes';
import { taxonomy_routes } from './taxonomy/taxonomy.routes';
import { menu_routes } from './menu/menu.routes';
import { revision_routes } from './revision/revision.routes';

interface MockDb {
  select: ReturnType<typeof vi.fn>;
}

const mock_db = db as unknown as MockDb;

/** Creates a thenable Drizzle-like select chain that resolves to `result`. */
function make_select_chain(result: unknown[]): Record<string, ReturnType<typeof vi.fn>> {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ['from', 'where', 'limit', 'orderBy', 'offset', 'innerJoin', 'leftJoin', 'groupBy'];
  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }
  (chain as unknown as { then: unknown }).then = (resolve: (v: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

type AuthUser = { user_id?: string; capabilities?: string[] };

async function build_app(register: (app: FastifyInstance) => Promise<void>, user?: AuthUser): Promise<FastifyInstance> {
  const app = Fastify();
  app.decorateRequest('user_id', undefined);
  app.addHook('preHandler', async (request) => {
    if (user?.user_id) {
      request.user_id = user.user_id;
    }
  });
  await app.register(register);
  await app.ready();
  return app;
}

function mock_user(capabilities: string[]) {
  mock_db.select.mockImplementation(() => make_select_chain([{ capabilities }]));
}

describe('RBAC route enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('content', () => {
    it('POST / requires content:create', async () => {
      const app = await build_app(content_routes);
      const res = await app.inject({ method: 'POST', url: '/', payload: { type: 'post', slug: 'a', title: 'A', status: 'DRAFT', meta: {}, taxonomy_ids: [], is_sticky: false, format: 'standard' } });
      expect(res.statusCode).toBe(401);
      await app.close();
    });

    it('POST / returns 403 without content:create', async () => {
      mock_user([]);
      const app = await build_app(content_routes, { user_id: 'u1' });
      const res = await app.inject({ method: 'POST', url: '/', payload: { type: 'post', slug: 'a', title: 'A', status: 'DRAFT', meta: {}, taxonomy_ids: [], is_sticky: false, format: 'standard' } });
      expect(res.statusCode).toBe(403);
      expect(res.json().error.message).toContain('content:create');
      await app.close();
    });

    it('PUT /:id requires content:edit:any or content:edit:own', async () => {
      mock_user([]);
      const app = await build_app(content_routes, { user_id: 'u1' });
      const res = await app.inject({ method: 'PUT', url: '/c1', payload: { title: 'X' } });
      expect(res.statusCode).toBe(403);
      expect(res.json().error.message).toContain('content:edit:any');
      expect(res.json().error.message).toContain('content:edit:own');
      await app.close();
    });

    it('PUT /:id allows content:edit:own through capability gate', async () => {
      mock_user(['content:edit:own']);
      const app = await build_app(content_routes, { user_id: 'u1' });
      const res = await app.inject({ method: 'PUT', url: '/c1', payload: { title: 'X' } });
      expect(res.statusCode).toBe(200);
      await app.close();
    });

    it('DELETE /:id requires content:edit:any or content:edit:own', async () => {
      mock_user([]);
      const app = await build_app(content_routes, { user_id: 'u1' });
      const res = await app.inject({ method: 'DELETE', url: '/c1' });
      expect(res.statusCode).toBe(403);
      expect(res.json().error.message).toContain('content:edit:any');
      expect(res.json().error.message).toContain('content:edit:own');
      await app.close();
    });

    it('DELETE /:id allows content:edit:own through capability gate', async () => {
      mock_user(['content:edit:own']);
      const app = await build_app(content_routes, { user_id: 'u1' });
      const res = await app.inject({ method: 'DELETE', url: '/c1' });
      expect(res.statusCode).toBe(200);
      await app.close();
    });

    it('GET / remains public', async () => {
      const app = await build_app(content_routes);
      const res = await app.inject({ method: 'GET', url: '/?page=1&limit=20&sort=created_at&order=desc' });
      expect(res.statusCode).toBe(200);
      await app.close();
    });
  });

  describe('media', () => {
    it('POST /upload requires media:upload', async () => {
      mock_user([]);
      const app = await build_app(media_routes, { user_id: 'u1' });
      const res = await app.inject({ method: 'POST', url: '/upload', payload: { filename: 'a.png', mimetype: 'image/png', size: 1, url: '/a.png' } });
      expect(res.statusCode).toBe(403);
      expect(res.json().error.message).toContain('media:upload');
      await app.close();
    });

    it('DELETE /:id requires media:delete', async () => {
      mock_user([]);
      const app = await build_app(media_routes, { user_id: 'u1' });
      const res = await app.inject({ method: 'DELETE', url: '/m1' });
      expect(res.statusCode).toBe(403);
      expect(res.json().error.message).toContain('media:delete');
      await app.close();
    });
  });

  describe('taxonomy', () => {
    it('POST / requires taxonomy:manage or legacy content:edit:any', async () => {
      mock_user([]);
      const app = await build_app(taxonomy_routes, { user_id: 'u1' });
      const res = await app.inject({ method: 'POST', url: '/', payload: { name: 'Cat', slug: 'cat', type: 'category' } });
      expect(res.statusCode).toBe(403);
      expect(res.json().error.message).toContain('taxonomy:manage');
      await app.close();
    });

    it('POST / allows taxonomy:manage', async () => {
      mock_user(['taxonomy:manage']);
      const app = await build_app(taxonomy_routes, { user_id: 'u1' });
      const res = await app.inject({ method: 'POST', url: '/', payload: { name: 'Cat', slug: 'cat', type: 'category' } });
      expect(res.statusCode).toBe(201);
      await app.close();
    });

    it('POST / allows legacy content:edit:any', async () => {
      mock_user(['content:edit:any']);
      const app = await build_app(taxonomy_routes, { user_id: 'u1' });
      const res = await app.inject({ method: 'POST', url: '/', payload: { name: 'Cat', slug: 'cat', type: 'category' } });
      expect(res.statusCode).toBe(201);
      await app.close();
    });

    it('GET / remains public', async () => {
      const app = await build_app(taxonomy_routes);
      const res = await app.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(200);
      await app.close();
    });
  });

  describe('menu', () => {
    it('POST / requires menu:manage or legacy settings:manage', async () => {
      mock_user([]);
      const app = await build_app(menu_routes, { user_id: 'u1' });
      const res = await app.inject({ method: 'POST', url: '/', payload: { name: 'Main', slug: 'main' } });
      expect(res.statusCode).toBe(403);
      expect(res.json().error.message).toContain('menu:manage');
      await app.close();
    });

    it('POST / allows menu:manage', async () => {
      mock_user(['menu:manage']);
      const app = await build_app(menu_routes, { user_id: 'u1' });
      const res = await app.inject({ method: 'POST', url: '/', payload: { name: 'Main', slug: 'main' } });
      expect(res.statusCode).toBe(201);
      await app.close();
    });

    it('POST / allows legacy settings:manage', async () => {
      mock_user(['settings:manage']);
      const app = await build_app(menu_routes, { user_id: 'u1' });
      const res = await app.inject({ method: 'POST', url: '/', payload: { name: 'Main', slug: 'main' } });
      expect(res.statusCode).toBe(201);
      await app.close();
    });
  });

  describe('revision', () => {
    it('POST restore requires content:edit:any or content:edit:own', async () => {
      mock_user([]);
      const app = await build_app(revision_routes, { user_id: 'u1' });
      const res = await app.inject({ method: 'POST', url: '/c1/revisions/r1/restore' });
      expect(res.statusCode).toBe(403);
      expect(res.json().error.message).toContain('content:edit:any');
      expect(res.json().error.message).toContain('content:edit:own');
      await app.close();
    });

    it('POST restore allows content:edit:own through capability gate', async () => {
      mock_user(['content:edit:own']);
      const app = await build_app(revision_routes, { user_id: 'u1' });
      const res = await app.inject({ method: 'POST', url: '/c1/revisions/r1/restore' });
      expect(res.statusCode).toBe(200);
      await app.close();
    });
  });
});

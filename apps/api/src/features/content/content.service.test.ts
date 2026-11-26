/**
 * Content Service Tests — Unit tests for content CRUD operations.
 *
 * Drizzle db is mocked to avoid requiring a running database.
 * Tests verify business logic: slug uniqueness, soft delete, pagination.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Creates a thenable chain mock that resolves to `result` at any await point. */
function create_query_chain<TResult>(result: TResult) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'from',
    'leftJoin',
    'innerJoin',
    'where',
    'orderBy',
    'limit',
    'offset',
    'values',
    'set',
    'returning',
    'groupBy',
  ] as const;

  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }

  // Drizzle query builders are thenable; support `await chain`.
  (chain as { then: (resolve: (value: TResult) => unknown) => Promise<unknown> }).then = (
    resolve: (value: TResult) => unknown,
  ) => Promise.resolve(result).then(resolve);

  return chain;
}

vi.mock('@typepress/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  // Table name placeholders used as Drizzle column refs in mock assertions.
  contents: {
    id: 'contents.id',
    type: 'contents.type',
    slug: 'contents.slug',
    title: 'contents.title',
    status: 'contents.status',
    meta: 'contents.meta',
    author_id: 'contents.author_id',
    created_at: 'contents.created_at',
    updated_at: 'contents.updated_at',
    published_at: 'contents.published_at',
    password: 'contents.password',
    is_sticky: 'contents.is_sticky',
    format: 'contents.format',
  },
  users: {
    id: 'users.id',
    name: 'users.name',
  },
  taxonomy_relations: {
    content_id: 'taxonomy_relations.content_id',
    taxonomy_id: 'taxonomy_relations.taxonomy_id',
  },
  taxonomies: {
    id: 'taxonomies.id',
    name: 'taxonomies.name',
    slug: 'taxonomies.slug',
    type: 'taxonomies.type',
  },
  ContentStatus: {
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
    ARCHIVED: 'ARCHIVED',
    TRASH: 'TRASH',
  },
}));

import { db } from '@typepress/db';
import { ContentService } from './content.service';

interface DbMock {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

const mock_db = db as unknown as DbMock;

describe('ContentService', () => {
  let service: ContentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContentService();
  });

  describe('list', () => {
    it('should return paginated content', async () => {
      const items = [
        {
          id: '1',
          title: 'Test',
          slug: 'test',
          type: 'post',
          status: 'PUBLISHED',
          author_name: 'Admin',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mock_db.select
        .mockReturnValueOnce(create_query_chain(items))
        .mockReturnValueOnce(create_query_chain([{ count: 1 }]));

      const result = await service.list({ page: 1, limit: 20, sort: 'created_at', order: 'desc' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.pagination?.total).toBe(1);
    });

    it('should filter by type', async () => {
      const items_chain = create_query_chain([]);
      const count_chain = create_query_chain([{ count: 0 }]);

      mock_db.select.mockReturnValueOnce(items_chain).mockReturnValueOnce(count_chain);

      await service.list({ page: 1, limit: 20, type: 'page', sort: 'created_at', order: 'desc' });

      // Verify type filter was applied through the where clause.
      expect(items_chain.where).toHaveBeenCalled();
      expect(count_chain.where).toHaveBeenCalled();
    });
  });

  describe('get_by_id', () => {
    it('should return content when found', async () => {
      const content_row = {
        id: '1',
        title: 'Test',
        slug: 'test',
        type: 'post',
        status: 'PUBLISHED',
        meta: {},
        author_id: 'a1',
        created_at: new Date(),
        updated_at: new Date(),
        published_at: null,
        password: null,
        is_sticky: false,
        format: 'standard',
      };

      mock_db.select
        .mockReturnValueOnce(create_query_chain([{ content: content_row, author_name: 'Admin' }]))
        .mockReturnValueOnce(create_query_chain([]));

      const result = await service.get_by_id('1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return 404 when not found', async () => {
      mock_db.select.mockReturnValueOnce(create_query_chain([]));

      const result = await service.get_by_id('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('create', () => {
    it('should create content with valid data', async () => {
      // Slug uniqueness check: no existing row.
      mock_db.select.mockReturnValueOnce(create_query_chain([]));
      mock_db.insert.mockReturnValueOnce(
        create_query_chain([{ id: '1', title: 'New Post', slug: 'new-post' }]),
      );

      const result = await service.create(
        {
          type: 'post',
          slug: 'new-post',
          title: 'New Post',
          status: 'DRAFT',
          meta: {},
          taxonomy_ids: [],
          is_sticky: false,
          format: 'standard',
        },
        'author-1',
      );

      expect(result.success).toBe(true);
      expect(mock_db.insert).toHaveBeenCalled();
    });

    it('should reject duplicate slugs', async () => {
      mock_db.select.mockReturnValueOnce(create_query_chain([{ id: 'existing' }]));

      const result = await service.create(
        {
          type: 'post',
          slug: 'existing-slug',
          title: 'Test',
          status: 'DRAFT',
          meta: {},
          taxonomy_ids: [],
          is_sticky: false,
          format: 'standard',
        },
        'author-1',
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONFLICT');
    });

    it('should return 403 when creating published content without content:publish', async () => {
      const result = await service.create(
        {
          type: 'post',
          slug: 'new-post',
          title: 'New Post',
          status: 'PUBLISHED',
          meta: {},
          taxonomy_ids: [],
          is_sticky: false,
          format: 'standard',
        },
        'author-1',
        { user_id: 'author-1', capabilities: ['content:create'] },
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FORBIDDEN');
      expect(result.error?.message).toContain('content:publish');
    });
  });

  describe('update', () => {
    it('should update content when actor has content:edit:any', async () => {
      mock_db.select.mockReturnValueOnce(create_query_chain([{ id: '1', slug: 'old', author_id: 'author-1' }]));
      mock_db.update.mockReturnValueOnce(create_query_chain([{ id: '1', title: 'Updated' }]));

      const result = await service.update(
        '1',
        { title: 'Updated' },
        { user_id: 'admin-1', capabilities: ['content:edit:any'] },
      );

      expect(result.success).toBe(true);
      expect(mock_db.update).toHaveBeenCalled();
    });

    it('should allow content:edit:own when user owns content', async () => {
      mock_db.select.mockReturnValueOnce(create_query_chain([{ id: '1', slug: 'old', author_id: 'u1' }]));
      mock_db.update.mockReturnValueOnce(create_query_chain([{ id: '1', title: 'Updated' }]));

      const result = await service.update(
        '1',
        { title: 'Updated' },
        { user_id: 'u1', capabilities: ['content:edit:own'] },
      );

      expect(result.success).toBe(true);
    });

    it('should return 403 for content:edit:own when user does not own content', async () => {
      mock_db.select.mockReturnValueOnce(create_query_chain([{ id: '1', slug: 'old', author_id: 'someone-else' }]));

      const result = await service.update(
        '1',
        { title: 'Updated' },
        { user_id: 'u1', capabilities: ['content:edit:own'] },
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FORBIDDEN');
    });

    it('should return 403 when publishing without content:publish', async () => {
      mock_db.select.mockReturnValueOnce(
        create_query_chain([{ id: '1', slug: 'old', author_id: 'u1', status: 'DRAFT' }]),
      );

      const result = await service.update(
        '1',
        { status: 'PUBLISHED' },
        { user_id: 'u1', capabilities: ['content:edit:own'] },
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FORBIDDEN');
      expect(result.error?.message).toContain('content:publish');
    });

    it('should allow publishing with content:publish', async () => {
      mock_db.select.mockReturnValueOnce(
        create_query_chain([{ id: '1', slug: 'old', author_id: 'u1', status: 'DRAFT' }]),
      );
      mock_db.update.mockReturnValueOnce(create_query_chain([{ id: '1', status: 'PUBLISHED' }]));

      const result = await service.update(
        '1',
        { status: 'PUBLISHED' },
        { user_id: 'u1', capabilities: ['content:edit:own', 'content:publish'] },
      );

      expect(result.success).toBe(true);
    });

    it('should emit content:before_update with pre-update snapshot when content fields change', async () => {
      const emit = vi.fn().mockResolvedValue(undefined);
      const hooks = { emit } as unknown as import('@typepress/core').HookRegistry;
      const hooked_service = new ContentService(hooks);

      mock_db.select.mockReturnValueOnce(
        create_query_chain([
          {
            id: '1',
            slug: 'old-slug',
            title: 'Old Title',
            type: 'post',
            status: 'DRAFT',
            meta: { body: 'old' },
            published_at: null,
            password: null,
            is_sticky: false,
            format: 'standard',
            author_id: 'u1',
          },
        ]),
      );
      mock_db.update.mockReturnValueOnce(create_query_chain([{ id: '1', title: 'New Title' }]));

      const result = await hooked_service.update(
        '1',
        { title: 'New Title' },
        { user_id: 'u1', capabilities: ['content:edit:any'] },
      );

      expect(result.success).toBe(true);
      expect(emit).toHaveBeenCalledTimes(1);
      expect(emit).toHaveBeenCalledWith('content:before_update', {
        content_id: '1',
        actor_id: 'u1',
        snapshot: {
          title: 'Old Title',
          slug: 'old-slug',
          type: 'post',
          status: 'DRAFT',
          meta: { body: 'old' },
          published_at: null,
          password: null,
          is_sticky: false,
          format: 'standard',
        },
      });
      // Snapshot must be emitted before persisting the update.
      const emit_order = emit.mock.invocationCallOrder[0] ?? 0;
      const update_order = mock_db.update.mock.invocationCallOrder[0] ?? 0;
      expect(emit_order).toBeLessThan(update_order);
    });

    it('should not emit content:before_update when only taxonomy_ids change', async () => {
      const emit = vi.fn().mockResolvedValue(undefined);
      const hooks = { emit } as unknown as import('@typepress/core').HookRegistry;
      const hooked_service = new ContentService(hooks);

      mock_db.select.mockReturnValueOnce(create_query_chain([{ id: '1', slug: 'old', author_id: 'u1' }]));
      mock_db.delete.mockReturnValueOnce(create_query_chain([]));
      mock_db.insert.mockReturnValueOnce(create_query_chain([]));

      const result = await hooked_service.update(
        '1',
        { taxonomy_ids: ['t1'] },
        { user_id: 'u1', capabilities: ['content:edit:any'] },
      );

      expect(result.success).toBe(true);
      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should soft delete (move to trash)', async () => {
      mock_db.select.mockReturnValueOnce(create_query_chain([{ id: '1', author_id: 'u1' }]));
      const update_chain = create_query_chain([]);
      mock_db.update.mockReturnValueOnce(update_chain);

      const result = await service.delete('1');

      expect(result.success).toBe(true);
      expect(mock_db.update).toHaveBeenCalled();
      expect(update_chain.set).toHaveBeenCalledWith({ status: 'TRASH' });
    });

    it('should return 404 for nonexistent content', async () => {
      mock_db.select.mockReturnValueOnce(create_query_chain([]));

      const result = await service.delete('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should allow content:edit:own when user owns content', async () => {
      mock_db.select.mockReturnValueOnce(create_query_chain([{ id: '1', author_id: 'u1' }]));
      mock_db.update.mockReturnValueOnce(create_query_chain([]));

      const result = await service.delete('1', { user_id: 'u1', capabilities: ['content:edit:own'] });

      expect(result.success).toBe(true);
    });

    it('should return 403 for content:edit:own when user does not own content', async () => {
      mock_db.select.mockReturnValueOnce(create_query_chain([{ id: '1', author_id: 'someone-else' }]));

      const result = await service.delete('1', { user_id: 'u1', capabilities: ['content:edit:own'] });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FORBIDDEN');
    });
  });
});

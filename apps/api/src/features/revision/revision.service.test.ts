/**
 * Revision Service Tests — verifies snapshot creation, cap enforcement, and restore behavior.
 *
 * Drizzle db is mocked; tests focus on service logic and permission checks.
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
  revisions: {
    id: 'revisions.id',
    content_id: 'revisions.content_id',
    data: 'revisions.data',
    author_id: 'revisions.author_id',
    created_at: 'revisions.created_at',
  },
  contents: {
    id: 'contents.id',
    title: 'contents.title',
    slug: 'contents.slug',
    type: 'contents.type',
    status: 'contents.status',
    meta: 'contents.meta',
    author_id: 'contents.author_id',
    published_at: 'contents.published_at',
    password: 'contents.password',
    is_sticky: 'contents.is_sticky',
    format: 'contents.format',
  },
  users: {
    id: 'users.id',
    name: 'users.name',
    email: 'users.email',
  },
}));

import { db } from '@typepress/db';
import { RevisionService, type RevisionSnapshot } from './revision.service';

interface DbMock {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

const mock_db = db as unknown as DbMock;

function make_snapshot(overrides: Partial<RevisionSnapshot> = {}): RevisionSnapshot {
  return {
    title: 'Title',
    slug: 'slug',
    type: 'post',
    status: 'DRAFT',
    meta: { body: 'hello' },
    published_at: null,
    password: null,
    is_sticky: false,
    format: 'standard',
    ...overrides,
  };
}

describe('RevisionService', () => {
  let service: RevisionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RevisionService();
  });

  describe('create', () => {
    it('should create a revision from an explicit snapshot', async () => {
      // Insert revision
      const insert_chain = create_query_chain(undefined);
      mock_db.insert.mockReturnValueOnce(insert_chain);
      // enforce_limit: count query
      mock_db.select.mockReturnValueOnce(create_query_chain([{ count: 1 }]));

      await service.create('c1', 'u1', make_snapshot({ title: 'Before Update' }));

      expect(mock_db.insert).toHaveBeenCalled();
      expect(insert_chain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          content_id: 'c1',
          author_id: 'u1',
          data: expect.objectContaining({ title: 'Before Update', slug: 'slug', status: 'DRAFT' }),
        }),
      );
      // Should not fetch content when snapshot is provided.
      // select was only called once for the enforce_limit count.
      expect(mock_db.select).toHaveBeenCalledTimes(1);
    });

    it('should enforce the 50-revision cap by deleting oldest overflow', async () => {
      // Insert revision
      mock_db.insert.mockReturnValueOnce(create_query_chain(undefined));
      // enforce_limit: count returns 52
      mock_db.select.mockReturnValueOnce(create_query_chain([{ count: 52 }]));
      // enforce_limit: select oldest overflow ids
      mock_db.select.mockReturnValueOnce(create_query_chain([{ id: 'r-old-1' }, { id: 'r-old-2' }]));
      // enforce_limit: deleteMany
      const delete_chain = create_query_chain(undefined);
      mock_db.delete.mockReturnValueOnce(delete_chain);

      await service.create('c1', 'u1', make_snapshot());

      expect(mock_db.delete).toHaveBeenCalled();
      expect(delete_chain.where).toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('should restore snapshot fields and create a pre-restore revision', async () => {
      const snapshot = make_snapshot({ title: 'Old', slug: 'old-slug', status: 'DRAFT', meta: { v: 1 } });

      // restore: select revision
      mock_db.select.mockReturnValueOnce(
        create_query_chain([
          {
            id: 'r1',
            content_id: 'c1',
            author_id: 'author-1',
            data: snapshot,
          },
        ]),
      );
      // restore: select content
      mock_db.select.mockReturnValueOnce(
        create_query_chain([
          {
            id: 'c1',
            author_id: 'author-1',
            title: 'Current',
            slug: 'current-slug',
            type: 'post',
            status: 'PUBLISHED',
            meta: { v: 2 },
            published_at: null,
            password: null,
            is_sticky: false,
            format: 'standard',
          },
        ]),
      );
      // restore: slug conflict check (slug changed old-slug != current-slug)
      mock_db.select.mockReturnValueOnce(create_query_chain([{ id: 'c1' }]));
      // create() called by restore: insert pre-restore revision
      const pre_restore_insert = create_query_chain(undefined);
      mock_db.insert.mockReturnValueOnce(pre_restore_insert);
      // create() -> enforce_limit: count
      mock_db.select.mockReturnValueOnce(create_query_chain([{ count: 2 }]));
      // restore: update content
      const update_chain = create_query_chain([]);
      mock_db.update.mockReturnValueOnce(update_chain);

      const result = await service.restore('r1', {
        user_id: 'author-1',
        capabilities: ['content:edit:own', 'content:publish'],
      });

      expect(result.success).toBe(true);
      // Pre-restore snapshot of current state.
      expect(pre_restore_insert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          content_id: 'c1',
          author_id: 'author-1',
          data: expect.objectContaining({ title: 'Current', slug: 'current-slug', status: 'PUBLISHED' }),
        }),
      );
      // Restore applies snapshot fields.
      expect(update_chain.set).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Old', slug: 'old-slug', status: 'DRAFT', meta: { v: 1 } }),
      );
    });

    it('should reject restore when actor lacks edit permission', async () => {
      mock_db.select.mockReturnValueOnce(
        create_query_chain([
          {
            id: 'r1',
            content_id: 'c1',
            author_id: 'author-1',
            data: make_snapshot(),
          },
        ]),
      );
      mock_db.select.mockReturnValueOnce(
        create_query_chain([
          {
            id: 'c1',
            author_id: 'someone-else',
            title: 'Current',
            slug: 'current',
            type: 'post',
            status: 'DRAFT',
            meta: {},
            published_at: null,
            password: null,
            is_sticky: false,
            format: 'standard',
          },
        ]),
      );

      const result = await service.restore('r1', { user_id: 'u1', capabilities: ['content:edit:own'] });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FORBIDDEN');
      expect(mock_db.update).not.toHaveBeenCalled();
    });

    it('should reject restore to PUBLISHED without content:publish', async () => {
      mock_db.select.mockReturnValueOnce(
        create_query_chain([
          {
            id: 'r1',
            content_id: 'c1',
            author_id: 'u1',
            data: make_snapshot({ status: 'PUBLISHED', slug: 'current' }),
          },
        ]),
      );
      mock_db.select.mockReturnValueOnce(
        create_query_chain([
          {
            id: 'c1',
            author_id: 'u1',
            title: 'Current',
            slug: 'current',
            type: 'post',
            status: 'DRAFT',
            meta: {},
            published_at: null,
            password: null,
            is_sticky: false,
            format: 'standard',
          },
        ]),
      );

      const result = await service.restore('r1', { user_id: 'u1', capabilities: ['content:edit:own'] });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FORBIDDEN');
      expect(result.error?.message).toContain('content:publish');
      expect(mock_db.update).not.toHaveBeenCalled();
    });

    it('should reject restore when target slug is used by another content', async () => {
      mock_db.select.mockReturnValueOnce(
        create_query_chain([
          {
            id: 'r1',
            content_id: 'c1',
            author_id: 'u1',
            data: make_snapshot({ slug: 'taken-slug' }),
          },
        ]),
      );
      // Current content lookup.
      mock_db.select.mockReturnValueOnce(
        create_query_chain([
          {
            id: 'c1',
            author_id: 'u1',
            title: 'Current',
            slug: 'current',
            type: 'post',
            status: 'DRAFT',
            meta: {},
            published_at: null,
            password: null,
            is_sticky: false,
            format: 'standard',
          },
        ]),
      );
      // Slug conflict check: another content owns the slug.
      mock_db.select.mockReturnValueOnce(create_query_chain([{ id: 'c2' }]));

      const result = await service.restore('r1', { user_id: 'u1', capabilities: ['content:edit:any'] });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONFLICT');
      expect(mock_db.update).not.toHaveBeenCalled();
    });
  });
});

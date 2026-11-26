/**
 * Comment Service Tests — Unit tests for comment creation and moderation.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockFn = ReturnType<typeof vi.fn>;

type SelectChain = PromiseLike<unknown> & Record<'from' | 'innerJoin' | 'leftJoin' | 'where' | 'orderBy' | 'limit' | 'offset' | 'groupBy', MockFn>;

/** Creates a chainable Drizzle select builder that resolves to `result` when awaited. */
function create_select_chain(result: unknown): SelectChain {
  const promise = Promise.resolve(result);
  const chain: SelectChain = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    groupBy: vi.fn(),
    then: promise.then.bind(promise),
  };
  const methods = ['from', 'innerJoin', 'leftJoin', 'where', 'orderBy', 'limit', 'offset', 'groupBy'] as const;
  for (const method of methods) {
    chain[method].mockReturnValue(chain);
  }
  return chain;
}

/** Creates a chainable Drizzle insert builder that resolves via returning(). */
function create_insert_chain(result: unknown): { values: MockFn; returning: MockFn } {
  const chain = {
    values: vi.fn(),
    returning: vi.fn().mockResolvedValue(result),
  };
  chain.values.mockReturnValue(chain);
  return chain;
}

/** Creates a chainable Drizzle update builder that resolves via returning(). */
function create_update_chain(result: unknown): { set: MockFn; where: MockFn; returning: MockFn } {
  const chain = {
    set: vi.fn(),
    where: vi.fn(),
    returning: vi.fn().mockResolvedValue(result),
  };
  chain.set.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return chain;
}

/** Creates a chainable Drizzle delete builder that resolves via returning(). */
function create_delete_chain(result: unknown): { where: MockFn; returning: MockFn } {
  const chain = {
    where: vi.fn(),
    returning: vi.fn().mockResolvedValue(result),
  };
  chain.where.mockReturnValue(chain);
  return chain;
}

vi.mock('@typepress/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  comments: { id: 'comments.id', content_id: 'comments.content_id', user_id: 'comments.user_id', author_name: 'comments.author_name', author_email: 'comments.author_email', body: 'comments.body', status: 'comments.status', parent_id: 'comments.parent_id', created_at: 'comments.created_at', updated_at: 'comments.updated_at' },
  contents: { id: 'contents.id', title: 'contents.title' },
  users: { id: 'users.id', name: 'users.name', email: 'users.email' },
}));

import { db } from '@typepress/db';
import { CommentService } from './comment.service';

const mock_db = db as unknown as {
  select: MockFn;
  insert: MockFn;
  update: MockFn;
  delete: MockFn;
};

interface CommentRow {
  id: string;
  content_id: string;
  content_title: string | null;
  user_id: string | null;
  author_name: string | null;
  author_email: string | null;
  body: string;
  status: 'PENDING' | 'APPROVED' | 'SPAM' | 'TRASH';
  parent_id: string | null;
  created_at: Date;
  updated_at: Date;
}

function make_comment_row(overrides: Partial<CommentRow> = {}): CommentRow {
  return {
    id: 'comment-1',
    content_id: 'content-1',
    content_title: 'Test Post',
    user_id: null,
    author_name: 'Guest',
    author_email: 'guest@example.com',
    body: 'Hello',
    status: 'PENDING',
    parent_id: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('CommentService', () => {
  let service: CommentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CommentService();
  });

  it('lists comments with pagination', async () => {
    // First select: joined comment rows; second select: count query.
    mock_db.select
      .mockReturnValueOnce(create_select_chain([make_comment_row()]))
      .mockReturnValueOnce(create_select_chain([{ total: 1 }]));

    const result = await service.list({ page: 1, limit: 20 });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.total_pages).toBe(1);
    expect(mock_db.select).toHaveBeenCalledTimes(2);
  });

  it('rejects guest comments missing author identity', async () => {
    // Content lookup returns existing content.
    mock_db.select.mockReturnValueOnce(create_select_chain([{ id: 'content-1', title: 'Test Post' }]));

    const result = await service.create(
      { content_id: 'content-1', body: 'Hello' },
      {},
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
    expect(mock_db.insert).not.toHaveBeenCalled();
  });

  it('creates a guest comment as pending', async () => {
    // Content lookup.
    mock_db.select.mockReturnValueOnce(create_select_chain([{ id: 'content-1', title: 'Test Post' }]));
    const insert_chain = create_insert_chain([{
      id: 'comment-1',
      content_id: 'content-1',
      user_id: null,
      author_name: 'Guest',
      author_email: 'guest@example.com',
      body: 'Hello',
      status: 'PENDING',
      parent_id: null,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    }]);
    mock_db.insert.mockReturnValueOnce(insert_chain);

    const result = await service.create(
      {
        content_id: 'content-1',
        author_name: 'Guest',
        author_email: 'guest@example.com',
        body: 'Hello',
      },
      {},
    );

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('PENDING');
    expect(mock_db.insert).toHaveBeenCalledTimes(1);
    expect(insert_chain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        content_id: 'content-1',
        status: 'PENDING',
        author_email: 'guest@example.com',
      }),
    );
  });

  it('rejects parent comment from another content item', async () => {
    // Content lookup, then parent comment lookup.
    mock_db.select
      .mockReturnValueOnce(create_select_chain([{ id: 'content-1', title: 'Test Post' }]))
      .mockReturnValueOnce(create_select_chain([{ id: 'parent-1', content_id: 'content-2' }]));

    const result = await service.create(
      {
        content_id: 'content-1',
        author_name: 'Guest',
        author_email: 'guest@example.com',
        body: 'Reply',
        parent_id: 'parent-1',
      },
      {},
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  it('moderates an existing comment', async () => {
    // Existing check, update returning, content title lookup.
    mock_db.select
      .mockReturnValueOnce(create_select_chain([{ id: 'comment-1' }]))
      .mockReturnValueOnce(create_select_chain([{ title: 'Test Post' }]));
    const update_chain = create_update_chain([{
      id: 'comment-1',
      content_id: 'content-1',
      user_id: null,
      author_name: 'Guest',
      author_email: 'guest@example.com',
      body: 'Hello',
      status: 'APPROVED',
      parent_id: null,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    }]);
    mock_db.update.mockReturnValueOnce(update_chain);

    const result = await service.moderate('comment-1', { status: 'APPROVED' });

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('APPROVED');
    expect(update_chain.set).toHaveBeenCalledWith({ status: 'APPROVED' });
  });

  it('returns not found when deleting missing comment', async () => {
    const delete_chain = create_delete_chain([]);
    mock_db.delete.mockReturnValueOnce(delete_chain);

    const result = await service.delete('missing');

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('NOT_FOUND');
  });
});

/**
 * GraphQL resolver authorization tests.
 *
 * Verifies mutations require auth/capabilities and protected content is not leaked.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Drizzle table sentinel objects for mock matching.
const tables = vi.hoisted(() => ({
  contents: { __table: 'contents' } as const,
  users: { __table: 'users' } as const,
  taxonomies: { __table: 'taxonomies' } as const,
  taxonomy_relations: { __table: 'taxonomy_relations' } as const,
  menus: { __table: 'menus' } as const,
  menu_items: { __table: 'menu_items' } as const,
}));

vi.mock('@typepress/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  contents: tables.contents,
  users: tables.users,
  taxonomies: tables.taxonomies,
  taxonomy_relations: tables.taxonomy_relations,
  menus: tables.menus,
  menu_items: tables.menu_items,
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: 'eq', args })),
  and: vi.fn((...args: unknown[]) => ({ op: 'and', args })),
  desc: vi.fn((arg: unknown) => ({ op: 'desc', arg })),
  asc: vi.fn((arg: unknown) => ({ op: 'asc', arg })),
  inArray: vi.fn((...args: unknown[]) => ({ op: 'inArray', args })),
  sql: Object.assign(vi.fn((...args: unknown[]) => ({ op: 'sql', args })), {
    raw: vi.fn((s: string) => s),
  }),
}));

vi.mock('../features/search/search.service', () => ({
  SearchService: class {
    async search() {
      return { success: true, data: [] };
    }
  },
}));

import { db } from '@typepress/db';
import { resolvers } from './resolvers';
import type { GraphQLContext } from './context';

interface MockDb {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

const mock_db = db as unknown as MockDb;

/** Creates a thenable Drizzle-like select chain that resolves to `result`. */
function make_select_chain(result: unknown[]): Record<string, ReturnType<typeof vi.fn>> {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ['from', 'where', 'limit', 'orderBy', 'offset', 'innerJoin', 'leftJoin', 'groupBy'];
  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }
  // Make chain thenable so `await db.select()...` resolves to result.
  (chain as unknown as { then: unknown }).then = (resolve: (v: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

/** Creates a thenable Drizzle-like insert/update/delete chain with returning(). */
function make_mutation_chain(result: unknown[]): Record<string, ReturnType<typeof vi.fn>> {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ['values', 'set', 'where', 'onConflictDoUpdate', 'returning'];
  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }
  (chain as unknown as { then: unknown }).then = (resolve: (v: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

function context(user_id: string | null): GraphQLContext {
  return {
    request: {} as GraphQLContext['request'],
    reply: {} as GraphQLContext['reply'],
    user_id,
  };
}

describe('GraphQL resolvers authz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects createContent when unauthenticated', async () => {
    await expect(
      resolvers.Mutation.createContent(
        null,
        { input: { type: 'post', slug: 'test', title: 'Test' } },
        context(null),
      ),
    ).rejects.toMatchObject({ extensions: { code: 'UNAUTHORIZED' } });

    expect(mock_db.insert).not.toHaveBeenCalled();
  });

  it('creates content with authenticated user id, not system', async () => {
    // require_actor -> select user capabilities
    mock_db.select.mockReturnValueOnce(make_select_chain([{ capabilities: ['content:create'] }]));
    mock_db.insert.mockReturnValueOnce(make_mutation_chain([{ id: 'c1', author_id: 'user-1' }]));

    const result = await resolvers.Mutation.createContent(
      null,
      { input: { type: 'post', slug: 'test', title: 'Test' } },
      context('user-1'),
    );

    expect(mock_db.insert).toHaveBeenCalled();
    const insert_chain = mock_db.insert.mock.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
    expect(insert_chain.values!).toHaveBeenCalledWith(
      expect.objectContaining({ author_id: 'user-1' }),
    );
    const values_arg = insert_chain.values!.mock.calls[0]![0] as { author_id: string };
    expect(values_arg.author_id).not.toBe('system');
    expect(result).toMatchObject({ id: 'c1' });
  });

  it('rejects updateContent without capability', async () => {
    // require_actor -> user has no edit capability
    mock_db.select.mockReturnValueOnce(make_select_chain([{ capabilities: ['media:upload'] }]));

    await expect(
      resolvers.Mutation.updateContent(null, { id: 'c1', input: { title: 'Nope' } }, context('user-1')),
    ).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });

    expect(mock_db.update).not.toHaveBeenCalled();
  });

  it('hides non-published content from anonymous query', async () => {
    // find_content_with_relations: select content row
    mock_db.select.mockReturnValueOnce(
      make_select_chain([{ id: 'c1', status: 'DRAFT', title: 'Draft', author_id: 'a1' }]),
    );
    // attach_content_relations: select authors, select taxonomy relations
    mock_db.select.mockReturnValueOnce(make_select_chain([{ id: 'a1', name: 'Author' }]));
    mock_db.select.mockReturnValueOnce(make_select_chain([]));

    const result = await resolvers.Query.content(null, { id: 'c1' }, context(null));

    expect(result).toBeNull();
  });

  it('defaults anonymous contents query to published only', async () => {
    // Query.contents: select rows, select count
    mock_db.select.mockReturnValueOnce(make_select_chain([]));
    mock_db.select.mockReturnValueOnce(make_select_chain([{ count: 0 }]));

    await resolvers.Query.contents(null, {}, context(null));

    // The first select chain's where() should have been called with a condition (PUBLISHED).
    const rows_chain = mock_db.select.mock.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
    expect(rows_chain.where!).toHaveBeenCalled();
    const where_arg = rows_chain.where!.mock.calls[0]![0];
    // We mocked eq to return { op: 'eq', args: [...] }; verify PUBLISHED is in the condition.
    expect(JSON.stringify(where_arg)).toContain('PUBLISHED');
  });

  it('rejects createContent when publishing without content:publish', async () => {
    // require_actor
    mock_db.select.mockReturnValueOnce(make_select_chain([{ capabilities: ['content:create'] }]));

    await expect(
      resolvers.Mutation.createContent(
        null,
        { input: { type: 'post', slug: 'test', title: 'Test', status: 'PUBLISHED' } },
        context('user-1'),
      ),
    ).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
      message: expect.stringContaining('content:publish'),
    });

    expect(mock_db.insert).not.toHaveBeenCalled();
  });

  it('allows updateContent for owner with content:edit:own', async () => {
    // require_actor
    mock_db.select.mockReturnValueOnce(make_select_chain([{ capabilities: ['content:edit:own'] }]));
    // require_content_edit: ownership lookup
    mock_db.select.mockReturnValueOnce(make_select_chain([{ author_id: 'user-1' }]));
    mock_db.update.mockReturnValueOnce(make_mutation_chain([{ id: 'c1', title: 'Updated' }]));

    const result = await resolvers.Mutation.updateContent(
      null,
      { id: 'c1', input: { title: 'Updated' } },
      context('user-1'),
    );

    expect(mock_db.update).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'c1' });
  });

  it('rejects updateContent for non-owner with content:edit:own', async () => {
    // require_actor
    mock_db.select.mockReturnValueOnce(make_select_chain([{ capabilities: ['content:edit:own'] }]));
    // ownership lookup
    mock_db.select.mockReturnValueOnce(make_select_chain([{ author_id: 'someone-else' }]));

    await expect(
      resolvers.Mutation.updateContent(null, { id: 'c1', input: { title: 'Nope' } }, context('user-1')),
    ).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });

    expect(mock_db.update).not.toHaveBeenCalled();
  });

  it('rejects publish status transition without content:publish', async () => {
    // require_actor: has edit:any but no publish
    mock_db.select.mockReturnValueOnce(make_select_chain([{ capabilities: ['content:edit:any'] }]));

    await expect(
      resolvers.Mutation.updateContent(
        null,
        { id: 'c1', input: { status: 'PUBLISHED' } },
        context('admin-1'),
      ),
    ).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
      message: expect.stringContaining('content:publish'),
    });

    expect(mock_db.update).not.toHaveBeenCalled();
  });

  it('allows publish status transition with content:publish', async () => {
    // require_actor
    mock_db.select.mockReturnValueOnce(
      make_select_chain([{ capabilities: ['content:edit:any', 'content:publish'] }]),
    );
    mock_db.update.mockReturnValueOnce(make_mutation_chain([{ id: 'c1', status: 'PUBLISHED' }]));

    const result = await resolvers.Mutation.updateContent(
      null,
      { id: 'c1', input: { status: 'PUBLISHED' } },
      context('admin-1'),
    );

    expect(mock_db.update).toHaveBeenCalled();
    const update_chain = mock_db.update.mock.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
    expect(update_chain.set!).toHaveBeenCalledWith(expect.objectContaining({ status: 'PUBLISHED' }));
    expect(result).toMatchObject({ status: 'PUBLISHED' });
  });

  it('rejects deleteContent for non-owner with content:edit:own', async () => {
    // require_actor
    mock_db.select.mockReturnValueOnce(make_select_chain([{ capabilities: ['content:edit:own'] }]));
    // ownership lookup
    mock_db.select.mockReturnValueOnce(make_select_chain([{ author_id: 'someone-else' }]));

    await expect(
      resolvers.Mutation.deleteContent(null, { id: 'c1' }, context('user-1')),
    ).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });

    expect(mock_db.update).not.toHaveBeenCalled();
  });

  it('allows deleteContent for owner with content:edit:own', async () => {
    // require_actor
    mock_db.select.mockReturnValueOnce(make_select_chain([{ capabilities: ['content:edit:own'] }]));
    // ownership lookup
    mock_db.select.mockReturnValueOnce(make_select_chain([{ author_id: 'user-1' }]));
    mock_db.update.mockReturnValueOnce(make_mutation_chain([{ id: 'c1', status: 'TRASH' }]));

    const result = await resolvers.Mutation.deleteContent(null, { id: 'c1' }, context('user-1'));

    expect(mock_db.update).toHaveBeenCalled();
    const update_chain = mock_db.update.mock.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
    expect(update_chain.set!).toHaveBeenCalledWith({ status: 'TRASH' });
    expect(result).toBe(true);
  });
});
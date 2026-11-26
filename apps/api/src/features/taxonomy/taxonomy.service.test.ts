/**
 * Taxonomy Service Tests — Unit tests for taxonomy CRUD operations.
 *
 * Drizzle db is mocked to avoid requiring a running database.
 * Tests verify slug uniqueness, hierarchy, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  taxonomies: { id: 'taxonomies.id', name: 'taxonomies.name', slug: 'taxonomies.slug', type: 'taxonomies.type', parent_id: 'taxonomies.parent_id' },
}));

import { db } from '@typepress/db';
import { TaxonomyService } from './taxonomy.service';

const mock_db = db as unknown as {
  select: MockFn;
  insert: MockFn;
  update: MockFn;
  delete: MockFn;
};

describe('TaxonomyService', () => {
  let service: TaxonomyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TaxonomyService();
  });

  describe('list', () => {
    it('should return all taxonomies', async () => {
      const rows_chain = create_select_chain([
        { id: '1', name: 'Tech', slug: 'tech', type: 'category', parent_id: null },
      ]);
      const children_chain = create_select_chain([]);
      mock_db.select
        .mockReturnValueOnce(rows_chain)
        .mockReturnValueOnce(children_chain);

      const result = await service.list({});

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect((result.data as Array<{ children: unknown[] }>)).toHaveLength(1);
      expect((result.data as Array<{ children: unknown[] }>)[0]?.children).toEqual([]);
    });

    it('should filter by type', async () => {
      const rows_chain = create_select_chain([]);
      mock_db.select.mockReturnValueOnce(rows_chain);

      await service.list({ type: 'tag' });

      // A type filter should be applied through the query where clause.
      expect(rows_chain.where).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create taxonomy with valid data', async () => {
      mock_db.select.mockReturnValueOnce(create_select_chain([])); // slug uniqueness check
      const insert_chain = create_insert_chain([{ id: '1', name: 'New', slug: 'new', type: 'category', parent_id: null }]);
      mock_db.insert.mockReturnValueOnce(insert_chain);

      const result = await service.create({ name: 'New', slug: 'new', type: 'category' });

      expect(result.success).toBe(true);
      expect(insert_chain.values).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New', slug: 'new', type: 'category' }),
      );
    });

    it('should reject duplicate slugs', async () => {
      mock_db.select.mockReturnValueOnce(create_select_chain([{ id: 'existing' }]));

      const result = await service.create({ name: 'Dup', slug: 'existing', type: 'category' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONFLICT');
      expect(mock_db.insert).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete existing taxonomy', async () => {
      const delete_chain = create_delete_chain([{ id: '1' }]);
      mock_db.delete.mockReturnValueOnce(delete_chain);

      const result = await service.delete('1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: 'Taxonomy deleted' });
    });

    it('should return 404 for nonexistent taxonomy', async () => {
      const delete_chain = create_delete_chain([]);
      mock_db.delete.mockReturnValueOnce(delete_chain);

      const result = await service.delete('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });
});

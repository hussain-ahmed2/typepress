/**
 * Export/Import Service Tests — validates import hardening and safe author handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const tables = vi.hoisted(() => ({
  users: { __table: 'users' } as const,
  contents: { __table: 'contents' } as const,
  taxonomies: { __table: 'taxonomies' } as const,
  taxonomy_relations: { __table: 'taxonomy_relations' } as const,
}));

vi.mock('@typepress/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  users: tables.users,
  contents: tables.contents,
  taxonomies: tables.taxonomies,
  taxonomy_relations: tables.taxonomy_relations,
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: 'eq', args })),
  inArray: vi.fn((...args: unknown[]) => ({ op: 'inArray', args })),
}));

import { db } from '@typepress/db';
import { ExportImportService, import_payload_schema } from './export_import';

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
  (chain as unknown as { then: unknown }).then = (resolve: (v: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

/** Creates a thenable Drizzle-like insert/update/delete chain. */
function make_mutation_chain(result: unknown[] = []): Record<string, ReturnType<typeof vi.fn>> {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ['values', 'set', 'where', 'onConflictDoUpdate', 'returning'];
  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }
  (chain as unknown as { then: unknown }).then = (resolve: (v: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

describe('import_payload_schema', () => {
  it('accepts a valid payload', () => {
    const result = import_payload_schema.safeParse({
      version: '1.0.0',
      exported_at: '2026-01-01T00:00:00.000Z',
      content: [
        {
          slug: 'hello',
          title: 'Hello',
          type: 'post',
          status: 'PUBLISHED',
          meta: {},
          author_email: 'admin@example.com',
        },
      ],
      taxonomies: [{ name: 'News', slug: 'news', type: 'category' }],
    });

    expect(result.success).toBe(true);
  });

  it('rejects malformed payloads', () => {
    const result = import_payload_schema.safeParse({
      version: 1,
      exported_at: null,
      content: 'not-an-array',
      taxonomies: [{}],
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid content items and oversized arrays', () => {
    const too_many = Array.from({ length: 5001 }, (_, i) => ({
      name: `T${i}`,
      slug: `t-${i}`,
      type: 'category',
    }));

    const result = import_payload_schema.safeParse({
      version: '1.0.0',
      exported_at: '2026-01-01T00:00:00.000Z',
      content: [{ slug: 'bad', title: 'Bad', type: 'post', status: 'NOPE', author_email: 'not-email' }],
      taxonomies: too_many,
    });

    expect(result.success).toBe(false);
  });
});

describe('ExportImportService.import_data', () => {
  let service: ExportImportService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ExportImportService();
  });

  it('remaps missing authors to importing admin and never creates users', async () => {
    // importing user lookup, then content author lookup (missing)
    mock_db.select
      .mockReturnValueOnce(make_select_chain([{ id: 'admin-1' }]))
      .mockReturnValueOnce(make_select_chain([]));
    const taxonomy_insert = make_mutation_chain();
    const content_insert = make_mutation_chain();
    mock_db.insert
      .mockReturnValueOnce(taxonomy_insert)
      .mockReturnValueOnce(content_insert);

    const result = await service.import_data(
      {
        version: '1.0.0',
        exported_at: '2026-01-01T00:00:00.000Z',
        taxonomies: [{ name: 'News', slug: 'news', type: 'category' }],
        content: [
          {
            slug: 'post-1',
            title: 'Post 1',
            type: 'post',
            status: 'DRAFT',
            meta: {},
            author_email: 'missing@example.com',
          },
        ],
      },
      'admin-1',
    );

    expect(result.success).toBe(true);
    expect(result.data?.authors_remapped).toBe(1);
    expect(result.data?.content_imported).toBe(1);
    // No insert should target the users table (no auto-created users).
    for (const call of mock_db.insert.mock.calls) {
      expect(call[0]).not.toBe(tables.users);
    }
    expect(content_insert.values!).toHaveBeenCalledWith(
      expect.objectContaining({ author_id: 'admin-1' }),
    );
  });

  it('rejects import when importing user does not exist', async () => {
    mock_db.select.mockReturnValueOnce(make_select_chain([]));

    const result = await service.import_data(
      {
        version: '1.0.0',
        exported_at: '2026-01-01T00:00:00.000Z',
        taxonomies: [],
        content: [],
      },
      'missing-admin',
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('UNAUTHORIZED');
    expect(mock_db.insert).not.toHaveBeenCalled();
  });

  it('uses existing author when found', async () => {
    // importing user lookup, then content author lookup (found)
    mock_db.select
      .mockReturnValueOnce(make_select_chain([{ id: 'admin-1' }]))
      .mockReturnValueOnce(make_select_chain([{ id: 'author-2' }]));
    const content_insert = make_mutation_chain();
    mock_db.insert.mockReturnValueOnce(content_insert);

    const result = await service.import_data(
      {
        version: '1.0.0',
        exported_at: '2026-01-01T00:00:00.000Z',
        taxonomies: [],
        content: [
          {
            slug: 'post-1',
            title: 'Post 1',
            type: 'post',
            status: 'PUBLISHED',
            meta: {},
            author_email: 'author@example.com',
          },
        ],
      },
      'admin-1',
    );

    expect(result.success).toBe(true);
    expect(result.data?.authors_remapped).toBe(0);
    for (const call of mock_db.insert.mock.calls) {
      expect(call[0]).not.toBe(tables.users);
    }
    expect(content_insert.values!).toHaveBeenCalledWith(
      expect.objectContaining({ author_id: 'author-2' }),
    );
  });
});

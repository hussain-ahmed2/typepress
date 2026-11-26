/**
 * Search Service Tests — Unit tests for full-text search.
 *
 * DB execute is mocked to avoid requiring a running database.
 * Tests verify query parameterization (SQL injection prevention),
 * type filtering, pagination, and empty-query behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

interface SqlMock {
  __drizzle_sql: true;
  strings: string[];
  values: unknown[];
}

const { sql_tag } = vi.hoisted(() => {
  const is_sql_mock = (value: unknown): value is SqlMock =>
    typeof value === 'object' && value !== null && '__drizzle_sql' in (value as Record<string, unknown>);

  // Minimal Drizzle sql tag mock that preserves template strings/values for assertions.
  const sql_tag_fn = (strings: TemplateStringsArray, ...values: unknown[]): SqlMock => ({
    __drizzle_sql: true,
    strings: Array.from(strings),
    values,
  });

  return { sql_tag: sql_tag_fn, is_sql_mock };
});

vi.mock('drizzle-orm', () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => sql_tag(strings, ...values),
}));

vi.mock('@typepress/db', () => ({
  db: {
    execute: vi.fn(),
  },
}));

import { db } from '@typepress/db';
import { SearchService } from './search.service';

const mock_db = db as unknown as {
  execute: ReturnType<typeof vi.fn>;
};

function is_sql_mock(value: unknown): value is SqlMock {
  return typeof value === 'object' && value !== null && '__drizzle_sql' in (value as Record<string, unknown>);
}

function get_sql_text(query: SqlMock): string {
  return query.strings.join('?');
}

function collect_sql_queries(query: SqlMock): SqlMock[] {
  const queries: SqlMock[] = [query];
  for (const value of query.values) {
    if (is_sql_mock(value)) {
      queries.push(...collect_sql_queries(value));
    }
  }
  return queries;
}

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SearchService();
  });

  it('should return empty results for blank query', async () => {
    const result = await service.search('   ');

    expect(result).toEqual({
      success: true,
      data: [],
      pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
    });
    expect(mock_db.execute).not.toHaveBeenCalled();
  });

  it('should run parameterized full-text search with pagination', async () => {
    mock_db.execute
      .mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            type: 'post',
            slug: 'hello-world',
            title: 'Hello World',
            excerpt: 'Intro',
            rank: 0.75,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ count: 1 }] });

    const result = await service.search('hello', undefined, 2, 10);

    expect(mock_db.execute).toHaveBeenCalledTimes(2);

    const search_query = mock_db.execute.mock.calls[0]![0] as SqlMock;
    const count_query = mock_db.execute.mock.calls[1]![0] as SqlMock;

    expect(get_sql_text(search_query)).toContain('plainto_tsquery');
    expect(get_sql_text(search_query)).toContain("AND c.status = 'PUBLISHED'");
    expect(get_sql_text(search_query)).toContain('LIMIT');
    expect(get_sql_text(search_query)).not.toContain('hello');

    const search_values = collect_sql_queries(search_query).flatMap((q) => q.values);
    expect(search_values).toContain('hello');
    expect(search_values).toContain(10);
    expect(search_values).toContain(10); // skip = (2-1)*10

    const count_values = collect_sql_queries(count_query).flatMap((q) => q.values);
    expect(count_values).toContain('hello');

    expect(result.success).toBe(true);
    expect(result.data).toEqual([
      {
        id: '1',
        type: 'post',
        slug: 'hello-world',
        title: 'Hello World',
        excerpt: 'Intro',
        rank: 0.75,
      },
    ]);
    expect(result.pagination).toEqual({ page: 2, limit: 10, total: 1, total_pages: 1 });
  });

  it('should apply type filter as a parameter, not SQL interpolation', async () => {
    mock_db.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });

    const malicious_type = "post' OR 1=1 --";
    await service.search('hello', malicious_type, 1, 20);

    const search_query = mock_db.execute.mock.calls[0]![0] as SqlMock;
    const count_query = mock_db.execute.mock.calls[1]![0] as SqlMock;

    for (const query of [search_query, count_query]) {
      const all_text = collect_sql_queries(query).map(get_sql_text).join('\n');
      expect(all_text).toContain('AND c.type =');
      expect(all_text).not.toContain(malicious_type);
      expect(all_text).not.toContain('OR 1=1');

      const values = collect_sql_queries(query).flatMap((q) => q.values);
      expect(values).toContain(malicious_type);
      expect(values).toContain('hello');
    }
  });

  it('should omit type filter when type is not provided', async () => {
    mock_db.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });

    await service.search('hello');

    const search_query = mock_db.execute.mock.calls[0]![0] as SqlMock;
    const text = get_sql_text(search_query);
    expect(text).not.toContain('AND c.type =');
    expect(text).toContain("AND c.status = 'PUBLISHED'");
  });
});

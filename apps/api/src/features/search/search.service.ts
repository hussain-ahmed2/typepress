import { db } from '@typepress/db';
import { sql } from 'drizzle-orm';
import type { PaginatedResponse } from '@typepress/shared-types';

export interface SearchResult {
  id: string;
  type: string;
  slug: string;
  title: string;
  excerpt: string;
  rank: number;
}

/** Raw row shape returned by the full-text search query. */
interface SearchResultRow {
  id: string;
  type: string;
  slug: string;
  title: string;
  excerpt: string;
  rank: number | string;
}

/** Raw row shape returned by the count query. */
interface SearchCountRow {
  count: number | string;
}

export class SearchService {
  async search(query: string, type?: string, page = 1, limit = 20): Promise<PaginatedResponse<SearchResult>> {
    const skip = (page - 1) * limit;

    // Build the search query using Postgres full-text search
    const search_term = query.trim();

    if (!search_term) {
      return {
        success: true,
        data: [],
        pagination: { page, limit, total: 0, total_pages: 0 },
      };
    }

    // Use parameterized Drizzle sql fragments for full-text search with ranking.
    // User input (search_term, type, limit, skip) is passed as query parameters,
    // never interpolated into SQL strings, to prevent SQL injection.
    const type_filter = type ? sql`AND c.type = ${type}` : sql``;

    const search_query = sql`
      SELECT
        c.id,
        c.type,
        c.slug,
        c.title,
        COALESCE(c.meta->>'excerpt', '') as excerpt,
        ts_rank(
          to_tsvector('english', c.title || ' ' || COALESCE(c.meta->>'excerpt', '')),
          plainto_tsquery('english', ${search_term})
        ) as rank
      FROM "Content" c
      WHERE to_tsvector('english', c.title || ' ' || COALESCE(c.meta->>'excerpt', '')) @@ plainto_tsquery('english', ${search_term})
      ${type_filter}
      AND c.status = 'PUBLISHED'
      ORDER BY rank DESC, c.updated_at DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const count_query = sql`
      SELECT COUNT(*)::int as count
      FROM "Content" c
      WHERE to_tsvector('english', c.title || ' ' || COALESCE(c.meta->>'excerpt', '')) @@ plainto_tsquery('english', ${search_term})
      ${type_filter}
      AND c.status = 'PUBLISHED'
    `;

    const [search_result, count_result] = await Promise.all([
      db.execute(search_query),
      db.execute(count_query),
    ]);

    // Drizzle node-postgres execute returns a QueryResult with typed rows.
    const results = search_result.rows as unknown as SearchResultRow[];
    const count_rows = count_result.rows as unknown as SearchCountRow[];
    const total = Number(count_rows[0]?.count ?? 0);

    return {
      success: true,
      data: results.map((r) => ({
        id: r.id,
        type: r.type,
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt || '',
        rank: Number(r.rank),
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
}

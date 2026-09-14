import { prisma } from '@typepress/db';
import type { PaginatedResponse } from '@typepress/shared-types';

export interface SearchResult {
  id: string;
  type: string;
  slug: string;
  title: string;
  excerpt: string;
  rank: number;
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

    // Use raw query for full-text search with ranking
    const where_clause = type
      ? `AND c.type = '${type}' AND c.status = 'PUBLISHED'`
      : `AND c.status = 'PUBLISHED'`;

    const results = await prisma.$queryRawUnsafe<SearchResult[]>(`
      SELECT
        c.id,
        c.type,
        c.slug,
        c.title,
        COALESCE(c.meta->>'excerpt', '') as excerpt,
        ts_rank(
          to_tsvector('english', c.title || ' ' || COALESCE(c.meta->>'excerpt', '')),
          plainto_tsquery('english', $1)
        ) as rank
      FROM "Content" c
      WHERE to_tsvector('english', c.title || ' ' || COALESCE(c.meta->>'excerpt', '')) @@ plainto_tsquery('english', $1)
      ${where_clause}
      ORDER BY rank DESC, c.updated_at DESC
      LIMIT $2 OFFSET $3
    `, search_term, limit, skip);

    const count_result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(`
      SELECT COUNT(*) as count
      FROM "Content" c
      WHERE to_tsvector('english', c.title || ' ' || COALESCE(c.meta->>'excerpt', '')) @@ plainto_tsquery('english', $1)
      ${where_clause}
    `, search_term);

    const total = Number(count_result[0]?.count ?? 0);

    return {
      success: true,
      data: results.map((r) => ({
        ...r,
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

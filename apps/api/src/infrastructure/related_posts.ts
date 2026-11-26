/**
 * Related Posts Service — Finds related content based on taxonomies.
 *
 * Algorithm:
 *   1. Get taxonomies for the current content
 *   2. Find other content with the same taxonomies
 *   3. Rank by number of shared taxonomies
 *   4. Return top N results
 */
import { db, contents, taxonomy_relations } from '@typepress/db';
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';

export interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  type: string;
  shared_taxonomies: number;
}

export class RelatedPostsService {
  /**
   * Find related content items based on shared taxonomies.
   */
  async find(content_id: string, limit = 5): Promise<RelatedPost[]> {
    // Get current content's taxonomies
    const content_taxonomies = await db
      .select({ taxonomy_id: taxonomy_relations.taxonomy_id })
      .from(taxonomy_relations)
      .where(eq(taxonomy_relations.content_id, content_id));

    if (content_taxonomies.length === 0) return [];

    const taxonomy_ids = content_taxonomies.map((t) => t.taxonomy_id);

    // Find other content with the same taxonomies, ranked by shared count.
    const shared_count = sql<number>`count(${taxonomy_relations.taxonomy_id})::int`;
    const related = await db
      .select({
        content_id: taxonomy_relations.content_id,
        shared_taxonomies: shared_count,
      })
      .from(taxonomy_relations)
      .where(
        and(
          inArray(taxonomy_relations.taxonomy_id, taxonomy_ids),
          ne(taxonomy_relations.content_id, content_id),
        ),
      )
      .groupBy(taxonomy_relations.content_id)
      .orderBy(desc(shared_count))
      .limit(limit);

    if (related.length === 0) return [];

    // Fetch content details for published matches only.
    const content_ids = related.map((r) => r.content_id);
    const related_contents = await db
      .select({
        id: contents.id,
        slug: contents.slug,
        title: contents.title,
        type: contents.type,
      })
      .from(contents)
      .where(and(inArray(contents.id, content_ids), eq(contents.status, 'PUBLISHED')));

    const content_map = new Map(related_contents.map((c) => [c.id, c]));

    return related
      .map((r) => {
        const c = content_map.get(r.content_id);
        if (!c) return null;
        return {
          id: c.id,
          slug: c.slug,
          title: c.title,
          type: c.type,
          shared_taxonomies: r.shared_taxonomies,
        };
      })
      .filter((r): r is RelatedPost => r !== null);
  }
}

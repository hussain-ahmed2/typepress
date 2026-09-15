/**
 * Related Posts Service — Finds related content based on taxonomies.
 *
 * Algorithm:
 *   1. Get taxonomies for the current content
 *   2. Find other content with the same taxonomies
 *   3. Rank by number of shared taxonomies
 *   4. Return top N results
 */
import { prisma } from '@typepress/db';

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
    const content = await prisma.content.findUnique({
      where: { id: content_id },
      include: {
        taxonomies: { select: { taxonomy_id: true } },
      },
    });

    if (!content || content.taxonomies.length === 0) return [];

    const taxonomy_ids = content.taxonomies.map((t) => t.taxonomy_id);

    // Find other content with the same taxonomies
    const related = await prisma.taxonomyRelation.groupBy({
      by: ['content_id'],
      where: {
        taxonomy_id: { in: taxonomy_ids },
        content_id: { not: content_id },
      },
      _count: { taxonomy_id: true },
      orderBy: { _count: { taxonomy_id: 'desc' } },
      take: limit,
    });

    if (related.length === 0) return [];

    // Fetch content details
    const content_ids = related.map((r) => r.content_id);
    const contents = await prisma.content.findMany({
      where: { id: { in: content_ids }, status: 'PUBLISHED' },
      select: { id: true, slug: true, title: true, type: true },
    });

    const content_map = new Map(contents.map((c) => [c.id, c]));

    return related
      .map((r) => {
        const c = content_map.get(r.content_id);
        if (!c) return null;
        return {
          id: c.id,
          slug: c.slug,
          title: c.title,
          type: c.type,
          shared_taxonomies: r._count.taxonomy_id,
        };
      })
      .filter((r): r is RelatedPost => r !== null);
  }
}

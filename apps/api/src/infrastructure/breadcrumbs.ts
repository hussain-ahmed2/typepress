/**
 * Breadcrumbs Service — Automatic breadcrumb generation.
 *
 * Generates breadcrumb trails for content based on taxonomy hierarchy.
 * Includes Schema.org structured data for SEO.
 */
import { db, contents, taxonomies, taxonomy_relations } from '@typepress/db';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export interface BreadcrumbItem {
  name: string;
  slug: string;
  url: string;
}

export interface BreadcrumbSchema {
  '@context': string;
  '@type': string;
  itemListElement: Array<{
    '@type': string;
    position: number;
    name: string;
    item: string;
  }>;
}

export class BreadcrumbService {
  private site_url: string;
  private separator: string;

  constructor(site_url?: string, separator?: string) {
    this.site_url = site_url || process.env.SITE_URL || 'http://localhost:4001';
    this.separator = separator || '›';
  }

  /**
   * Generate breadcrumbs for a content item.
   */
  async generate(content_id: string): Promise<BreadcrumbItem[]> {
    const [content] = await db
      .select({ id: contents.id, title: contents.title, slug: contents.slug })
      .from(contents)
      .where(eq(contents.id, content_id))
      .limit(1);

    if (!content) return [];

    // Self-join to fetch parent taxonomy in one query.
    const parent_taxonomies = alias(taxonomies, 'parent_taxonomy');
    const relations = await db
      .select({
        taxonomy_name: taxonomies.name,
        taxonomy_slug: taxonomies.slug,
        parent_name: parent_taxonomies.name,
        parent_slug: parent_taxonomies.slug,
      })
      .from(taxonomy_relations)
      .innerJoin(taxonomies, eq(taxonomy_relations.taxonomy_id, taxonomies.id))
      .leftJoin(parent_taxonomies, eq(taxonomies.parent_id, parent_taxonomies.id))
      .where(eq(taxonomy_relations.content_id, content_id));

    const breadcrumbs: BreadcrumbItem[] = [
      { name: 'Home', slug: '', url: this.site_url },
    ];

    // Add taxonomy parents to breadcrumbs
    for (const rel of relations) {
      if (rel.parent_name && rel.parent_slug) {
        breadcrumbs.push({
          name: rel.parent_name,
          slug: rel.parent_slug,
          url: `${this.site_url}/taxonomy/${rel.parent_slug}`,
        });
      }
      breadcrumbs.push({
        name: rel.taxonomy_name,
        slug: rel.taxonomy_slug,
        url: `${this.site_url}/taxonomy/${rel.taxonomy_slug}`,
      });
    }

    // Add current content
    breadcrumbs.push({
      name: content.title,
      slug: content.slug,
      url: `${this.site_url}/${content.slug}`,
    });

    return breadcrumbs;
  }

  /**
   * Generate Schema.org structured data for breadcrumbs.
   */
  to_schema(breadcrumbs: BreadcrumbItem[]): BreadcrumbSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };
  }

  /**
   * Generate breadcrumb HTML string.
   */
  to_html(breadcrumbs: BreadcrumbItem[]): string {
    return breadcrumbs
      .map((item, index) => {
        if (index === breadcrumbs.length - 1) {
          return `<span>${item.name}</span>`;
        }
        return `<a href="${item.url}">${item.name}</a>`;
      })
      .join(` <span class="separator">${this.separator}</span> `);
  }
}

/**
 * Breadcrumbs Service — Automatic breadcrumb generation.
 *
 * Generates breadcrumb trails for content based on taxonomy hierarchy.
 * Includes Schema.org structured data for SEO.
 */
import { prisma } from '@typepress/db';

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
    const content = await prisma.content.findUnique({
      where: { id: content_id },
      include: {
        taxonomies: {
          include: {
            taxonomy: {
              include: { parent: true },
            },
          },
        },
      },
    });

    if (!content) return [];

    const breadcrumbs: BreadcrumbItem[] = [
      { name: 'Home', slug: '', url: this.site_url },
    ];

    // Add taxonomy parents to breadcrumbs
    for (const rel of content.taxonomies) {
      const taxonomy = rel.taxonomy;
      if (taxonomy.parent) {
        breadcrumbs.push({
          name: taxonomy.parent.name,
          slug: taxonomy.parent.slug,
          url: `${this.site_url}/taxonomy/${taxonomy.parent.slug}`,
        });
      }
      breadcrumbs.push({
        name: taxonomy.name,
        slug: taxonomy.slug,
        url: `${this.site_url}/taxonomy/${taxonomy.slug}`,
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

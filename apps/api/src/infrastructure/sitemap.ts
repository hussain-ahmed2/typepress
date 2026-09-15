import { prisma } from '@typepress/db';

/**
 * Sitemap Generator — Creates XML sitemaps for search engines.
 */
export class SitemapGenerator {
  async generate(): Promise<string> {
    const contents = await prisma.content.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { updated_at: 'desc' },
      select: {
        slug: true,
        updated_at: true,
        type: true,
      },
    });

    const site_url = process.env.SITE_URL || 'http://localhost:4001';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Add homepage
    xml += `
  <url>
    <loc>${site_url}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    for (const content of contents) {
      const priority = content.type === 'page' ? '0.8' : '0.6';
      xml += `
  <url>
    <loc>${site_url}/${content.slug}</loc>
    <lastmod>${content.updated_at.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
    }

    xml += `
</urlset>`;

    return xml;
  }
}

export const sitemap_generator = new SitemapGenerator();

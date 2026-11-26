import { db, contents } from '@typepress/db';
import { desc, eq } from 'drizzle-orm';

/**
 * Sitemap Generator — Creates XML sitemaps for search engines.
 */
export class SitemapGenerator {
  async generate(): Promise<string> {
    const rows = await db
      .select({
        slug: contents.slug,
        updated_at: contents.updated_at,
        type: contents.type,
      })
      .from(contents)
      .where(eq(contents.status, 'PUBLISHED'))
      .orderBy(desc(contents.updated_at));

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

    for (const content of rows) {
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

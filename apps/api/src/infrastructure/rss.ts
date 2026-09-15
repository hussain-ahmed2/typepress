import { prisma } from '@typepress/db';

/**
 * RSS Feed Generator — Creates RSS 2.0 feeds for content.
 */
export class RSSFeedGenerator {
  async generate(content_type?: string): Promise<string> {
    const where: Record<string, unknown> = { status: 'PUBLISHED' };
    if (content_type) where.type = content_type;

    const contents = await prisma.content.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 50,
      include: { author: { select: { name: true } } },
    });

    const site_url = process.env.SITE_URL || 'http://localhost:4001';
    const site_title = 'Typepress';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${site_title}</title>
    <link>${site_url}</link>
    <description>A TypeScript-native CMS</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`;

    for (const content of contents) {
      const meta = content.meta as Record<string, unknown>;
      const excerpt = (meta.excerpt as string) || '';
      const pub_date = content.published_at || content.created_at;

      xml += `
    <item>
      <title><![CDATA[${content.title}]]></title>
      <link>${site_url}/${content.slug}</link>
      <guid>${site_url}/${content.slug}</guid>
      <description><![CDATA[${excerpt}]]></description>
      <pubDate>${pub_date.toUTCString()}</pubDate>
      <author>${content.author.name || 'Unknown'}</author>
    </item>`;
    }

    xml += `
  </channel>
</rss>`;

    return xml;
  }
}

export const rss_generator = new RSSFeedGenerator();

/**
 * Social Sharing Plugin — Generates share URLs for social platforms.
 *
 * Features:
 *   - Share URLs for Twitter, Facebook, LinkedIn, Reddit, WhatsApp
 *   - Open Graph meta tag generation
 *   - Share count placeholder (requires external API)
 */
import { define_plugin } from '@typepress/plugin-sdk';

export interface ShareURLs {
  twitter: string;
  facebook: string;
  linkedin: string;
  reddit: string;
  whatsapp: string;
}

export function generate_share_urls(title: string, url: string): ShareURLs {
  const encoded_title = encodeURIComponent(title);
  const encoded_url = encodeURIComponent(url);

  return {
    twitter: `https://twitter.com/intent/tweet?text=${encoded_title}&url=${encoded_url}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded_url}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encoded_url}&title=${encoded_title}`,
    reddit: `https://reddit.com/submit?url=${encoded_url}&title=${encoded_title}`,
    whatsapp: `https://wa.me/?text=${encoded_title}%20${encoded_url}`,
  };
}

export function generate_og_tags(title: string, description: string, image?: string) {
  return {
    'og:title': title,
    'og:description': description,
    'og:type': 'article',
    'og:image': image || '',
    'twitter:card': 'summary_large_image',
    'twitter:title': title,
    'twitter:description': description,
  };
}

export default define_plugin({
  name: 'social-sharing',
  version: '1.0.0',
  description: 'Social sharing buttons for content',

  register(api) {
    // Add share URLs to content via filter
    api.register_filter<Record<string, unknown>>('content:share_urls', (content: Record<string, unknown>) => {
      const site_url = process.env.SITE_URL || 'http://localhost:4001';
      const url = `${site_url}/${content.slug}`;
      return {
        ...content,
        share_urls: generate_share_urls(content.title as string, url),
      };
    });

    console.log('[SocialSharing] Plugin loaded — share URLs available via filter');
  },
});

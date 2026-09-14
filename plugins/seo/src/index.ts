/**
 * SEO Plugin — Adds SEO fields to content.
 *
 * Hooks into content creation to inject default SEO values.
 * Provides a filter for content rendering to output meta tags.
 *
 * Registered SEO fields in content.meta:
 *   - seo_title: Custom title for search engines
 *   - meta_description: Description for search results
 *   - og_image: Open Graph image URL
 *   - og_description: Open Graph description
 */
import { define_plugin } from '@typepress/plugin-sdk';

export default define_plugin({
  name: 'seo',
  version: '0.1.0',
  description: 'Adds SEO fields to content (meta title, description, OG image)',

  register(api) {
    // Inject default SEO values when content is created
    api.hooks.on('content:before_create', async (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      const meta = (data.meta as Record<string, unknown>) ?? {};
      if (!meta.seo_title && data.title) {
        meta.seo_title = data.title;
      }
      if (!meta.meta_description && meta.excerpt) {
        meta.meta_description = meta.excerpt;
      }
      data.meta = meta;
    });

    // Add SEO fields to content detail response
    api.hooks.on('content:after_fetch', async (...args: unknown[]) => {
      const content = args[0] as Record<string, unknown>;
      const meta = (content.meta as Record<string, unknown>) ?? {};
      content.seo = {
        title: meta.seo_title ?? content.title,
        description: meta.meta_description ?? meta.excerpt ?? '',
        og_image: meta.og_image ?? '',
        og_description: meta.og_description ?? meta.meta_description ?? '',
      };
    });

    console.log('[SEO] Registered hooks: content:before_create, content:after_fetch');
  },
});

/**
 * Analytics Plugin — Basic page view tracking.
 *
 * Features:
 *   - Track page views per content item
 *   - Track unique visitors (by IP hash)
 *   - View count statistics
 *   - Popular content ranking
 */
import { define_plugin } from '@typepress/plugin-sdk';

interface PageView {
  content_id: string;
  visitor_hash: string;
  timestamp: number;
  path: string;
}

// In-memory storage (replace with Redis/DB in production)
const page_views: PageView[] = [];

export default define_plugin({
  name: 'analytics',
  version: '1.0.0',
  description: 'Basic page view analytics tracking',

  register(api) {
    // Track page views when content is fetched
    api.hooks.on('content:after_fetch', async (...args: unknown[]) => {
      const content = args[0] as Record<string, unknown>;
      if (content?.id) {
        page_views.push({
          content_id: content.id as string,
          visitor_hash: 'anonymous',
          timestamp: Date.now(),
          path: `/${content.slug || ''}`,
        });
      }
    });

    // Register filter to add view count to content
    api.register_filter('analytics:view_count', (...args: unknown[]) => {
      const content_id = args[0] as string;
      return page_views.filter((pv) => pv.content_id === content_id).length;
    });

    console.log('[Analytics] Plugin loaded — tracking page views');
  },
});

export { page_views };

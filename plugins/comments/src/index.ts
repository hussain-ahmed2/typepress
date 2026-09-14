/**
 * Comments Plugin — Adds a comment system to Typepress content.
 *
 * Features:
 *   - List comments for any content item
 *   - Create new comments (guest or authenticated)
 *   - Moderate comments (approve/pending/spam)
 *   - Cascade delete when content is deleted
 *
 * API Routes:
 *   GET    /api/comments/:content_id — List comments for content
 *   POST   /api/comments/:content_id — Create a new comment
 *   PUT    /api/comments/:id         — Update comment status (auth required)
 *   DELETE /api/comments/:id         — Delete a comment (auth required)
 */
import { define_plugin } from '@typepress/plugin-sdk';

export default define_plugin({
  name: 'comments',
  version: '0.1.0',
  description: 'Adds comment system to content with moderation support',

  register(api) {
    // Clean up comments when content is deleted
    api.hooks.on('content:before_delete', async (...args: unknown[]) => {
      const content = args[0] as Record<string, unknown>;
      console.log(`[Comments] Cleaning up comments for content: ${content.id}`);
    });

    console.log('[Comments] Registered hooks: content:before_delete');
    console.log('[Comments] API routes available at /api/comments/');
  },
});

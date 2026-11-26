/**
 * API client helpers for the public renderer.
 *
 * All fetches are server-side and participate in Next.js ISR caching.
 * Revalidation tags allow on-demand invalidation from API webhooks/actions.
 */
import type {
  ApiResponse,
  ContentDetail,
  ContentListItem,
  PaginatedResponse,
} from '@typepress/shared-types';

/** Base URL for the Typepress API. Server-only env var preferred. */
const API_BASE: string = process.env.API_URL ?? 'http://localhost:8000';

/** Default ISR window for public content (seconds). */
export const CONTENT_REVALIDATE_SECONDS = 60;

/** Cache tags used for on-demand revalidation. */
export const content_tags = {
  list: 'content:list',
  detail: (slug: string): string => `content:${slug}`,
} as const;

interface ListContentOptions {
  readonly status?: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | 'TRASH';
  readonly limit?: number;
  readonly page?: number;
}

/**
 * Fetch published content list for the home/feed view.
 * Returns an empty array on failure so the page can render a stable empty state.
 */
export async function get_published_content(
  options: ListContentOptions = {},
): Promise<ContentListItem[]> {
  const { status = 'PUBLISHED', limit = 20, page = 1 } = options;
  const params = new URLSearchParams({
    status,
    limit: String(limit),
    page: String(page),
  });

  try {
    const response = await fetch(`${API_BASE}/api/content?${params.toString()}`, {
      next: {
        revalidate: CONTENT_REVALIDATE_SECONDS,
        tags: [content_tags.list],
      },
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PaginatedResponse<ContentListItem>;
    if (!payload.success || !Array.isArray(payload.data)) {
      return [];
    }

    return payload.data;
  } catch {
    // Network/API failures should not crash public rendering.
    return [];
  }
}

/**
 * Fetch a single content item by slug for public rendering.
 * Returns null for not-found or invalid responses.
 */
export async function get_content_by_slug(slug: string): Promise<ContentDetail | null> {
  try {
    const response = await fetch(`${API_BASE}/api/content/slug/${encodeURIComponent(slug)}`, {
      next: {
        revalidate: CONTENT_REVALIDATE_SECONDS,
        tags: [content_tags.list, content_tags.detail(slug)],
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiResponse<ContentDetail>;
    if (!payload.success || !payload.data) {
      return null;
    }

    return payload.data;
  } catch {
    return null;
  }
}

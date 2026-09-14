/**
 * Content Page — Renders a single content item by slug.
 *
 * Uses dynamic route matching. Fetches content from the API by slug
 * and renders it with a basic article layout.
 */
import { notFound } from 'next/navigation';

const API_BASE = process.env.API_URL || 'http://localhost:8000';

interface ContentDetail {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  meta: { excerpt?: string; featured_image?: string; [key: string]: unknown };
  author_name: string | null;
  taxonomies: { id: string; name: string; slug: string; type: string }[];
  created_at: string;
  updated_at: string;
}

async function get_content(slug: string): Promise<ContentDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/api/content/slug/${slug}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: ContentDetail };
    return data.data || null;
  } catch {
    return null;
  }
}

export default async function ContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const content = await get_content(slug);

  if (!content) {
    notFound();
  }

  return (
    <article className="max-w-4xl mx-auto px-4 py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-bold">{content.title}</h1>
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
          <span>{content.author_name}</span>
          <span>·</span>
          <time>{new Date(content.created_at).toLocaleDateString()}</time>
        </div>
        {content.taxonomies.length > 0 && (
          <div className="flex gap-2 mt-4">
            {content.taxonomies.map((t) => (
              <span
                key={t.id}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600 text-lg">{content.meta?.excerpt}</p>
      </div>
    </article>
  );
}

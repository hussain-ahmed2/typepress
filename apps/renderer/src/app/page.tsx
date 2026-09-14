/**
 * Home Page — Lists published content from the Typepress API.
 *
 * Server-rendered at request time. Fetches content list from the API
 * and displays it as a blog-style feed.
 */
import Link from 'next/link';

const API_BASE = process.env.API_URL || 'http://localhost:8000';

interface ContentItem {
  id: string;
  type: string;
  slug: string;
  title: string;
  status: string;
  author_name: string | null;
  meta: { excerpt?: string };
  created_at: string;
}

async function get_content(): Promise<ContentItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/content?status=PUBLISHED&limit=20`);
    const data = (await res.json()) as { data?: ContentItem[] };
    return data.data || [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const contents = await get_content();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Latest Posts</h1>

      {contents.length === 0 ? (
        <p className="text-gray-500">No published content yet.</p>
      ) : (
        <div className="space-y-8">
          {contents.map((item) => (
            <article key={item.id} className="border-b border-gray-200 pb-8">
              <Link href={`/${item.slug}`} className="block group">
                <h2 className="text-2xl font-bold group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h2>
                {item.meta?.excerpt && (
                  <p className="text-gray-600 mt-2">{item.meta.excerpt}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <span>{item.author_name}</span>
                  <span>·</span>
                  <time>{new Date(item.created_at).toLocaleDateString()}</time>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

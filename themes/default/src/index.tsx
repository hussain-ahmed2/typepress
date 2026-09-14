/**
 * Default Theme — Clean, minimal blog theme for Typepress.
 *
 * Implements all required slots: header, footer, post_list, single_post.
 * Uses Tailwind CSS for styling.
 */
import { define_theme, type SlotProps } from '@typepress/theme-sdk';

/** Header slot — site title and navigation */
function Header({ site_title }: SlotProps) {
  return (
    <header className="bg-white border-b border-gray-200 py-4">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
        <a href="/" className="text-2xl font-bold text-gray-900 hover:text-blue-600">
          {site_title}
        </a>
        <nav className="flex gap-6 text-sm text-gray-600">
          <a href="/" className="hover:text-gray-900">Home</a>
          <a href="/content" className="hover:text-gray-900">Content</a>
        </nav>
      </div>
    </header>
  );
}

/** Footer slot — copyright and links */
function Footer({ site_title }: SlotProps) {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-8 mt-12">
      <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} {site_title}. Powered by Typepress.</p>
      </div>
    </footer>
  );
}

/** Post list slot — displays content items in a blog feed */
function PostList({ contents, site_title }: SlotProps) {
  if (!contents || contents.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">{site_title}</h1>
        <p className="text-gray-500">No posts yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">{site_title}</h1>
      <div className="space-y-8">
        {contents.map((item) => (
          <article key={item.id} className="border-b border-gray-200 pb-8">
            <a href={`/${item.slug}`} className="block group">
              <h2 className="text-2xl font-bold group-hover:text-blue-600 transition-colors">
                {item.title}
              </h2>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span>{item.author_name}</span>
                <span>·</span>
                <time>{new Date(item.created_at).toLocaleDateString()}</time>
              </div>
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}

/** Single post slot — displays a single content item */
function SinglePost({ content, taxonomies }: SlotProps) {
  if (!content) return null;

  return (
    <article className="max-w-4xl mx-auto px-4 py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-bold">{content.title}</h1>
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
          <span>{content.author_name}</span>
          <span>·</span>
          <time>{new Date(content.created_at).toLocaleDateString()}</time>
        </div>
        {taxonomies && taxonomies.length > 0 && (
          <div className="flex gap-2 mt-4">
            {taxonomies.map((t) => (
              <span key={t.id} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
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

/** Sidebar slot — optional, not implemented in default theme */
// function Sidebar({ }: SlotProps) { return null; }

export default define_theme({
  name: 'default',
  version: '0.1.0',
  description: 'Clean, minimal blog theme for Typepress',
  slots: {
    header: Header,
    footer: Footer,
    post_list: PostList,
    single_post: SinglePost,
  },
});

/**
 * Business Theme — Professional theme with sidebar and structured layout.
 *
 * Demonstrates how a different theme can provide the same slots
 * with a completely different visual design.
 */
import { define_theme, type SlotProps } from '@typepress/theme-sdk';

/** Header — dark navigation bar with logo */
function Header({ site_title }: SlotProps) {
  return (
    <header className="bg-gray-900 text-white py-4">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <a href="/" className="text-xl font-bold">{site_title}</a>
        <nav className="flex gap-8 text-sm">
          <a href="/" className="hover:text-gray-300">Home</a>
          <a href="/about" className="hover:text-gray-300">About</a>
          <a href="/services" className="hover:text-gray-300">Services</a>
          <a href="/contact" className="hover:text-gray-300">Contact</a>
        </nav>
      </div>
    </header>
  );
}

/** Footer — dark footer with columns */
function Footer({ site_title }: SlotProps) {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-3 gap-8">
        <div>
          <h3 className="text-white font-semibold mb-3">{site_title}</h3>
          <p className="text-sm">Professional solutions for modern businesses.</p>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-3">Quick Links</h3>
          <ul className="text-sm space-y-2">
            <li><a href="/" className="hover:text-white">Home</a></li>
            <li><a href="/about" className="hover:text-white">About</a></li>
            <li><a href="/contact" className="hover:text-white">Contact</a></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-3">Contact</h3>
          <p className="text-sm">hello@example.com</p>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 mt-8 pt-8 border-t border-gray-800 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} {site_title}. All rights reserved.</p>
      </div>
    </footer>
  );
}

/** Post list — card-based grid layout */
function PostList({ contents }: SlotProps) {
  if (!contents || contents.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <p className="text-gray-500">No articles yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold mb-8 text-center">Latest Articles</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contents.map((item) => (
          <a
            key={item.id}
            href={`/${item.slug}`}
            className="block bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="h-40 bg-gradient-to-br from-blue-500 to-purple-600" />
            <div className="p-6">
              <h3 className="text-lg font-bold mb-2">{item.title}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{item.author_name}</span>
                <span>·</span>
                <time>{new Date(item.created_at).toLocaleDateString()}</time>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/** Single post — wide layout with metadata */
function SinglePost({ content, taxonomies }: SlotProps) {
  if (!content) return null;

  return (
    <article className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 h-64 rounded-xl mb-8" />
      <header className="mb-8">
        <h1 className="text-4xl font-bold">{content.title}</h1>
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{content.type}</span>
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

/** Sidebar — with about and categories */
function Sidebar(): React.ReactElement {
  return (
    <aside className="bg-gray-50 p-6 rounded-lg">
      <h3 className="font-semibold mb-3">About</h3>
      <p className="text-sm text-gray-600 mb-6">Professional insights and updates from our team.</p>
      <h3 className="font-semibold mb-3">Categories</h3>
      <ul className="text-sm text-gray-600 space-y-2">
        <li><a href="/?type=post" className="hover:text-blue-600">Blog Posts</a></li>
        <li><a href="/?type=page" className="hover:text-blue-600">Pages</a></li>
      </ul>
    </aside>
  );
}

export default define_theme({
  name: 'business',
  version: '0.1.0',
  description: 'Professional business theme for Typepress',
  slots: {
    header: Header,
    footer: Footer,
    post_list: PostList,
    single_post: SinglePost,
    sidebar: Sidebar,
  },
});

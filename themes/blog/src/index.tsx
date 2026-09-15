import { define_theme, type SlotProps } from '@typepress/theme-sdk';

function Header({ site_title }: SlotProps) {
  return <header className="bg-white border-b py-4"><div className="max-w-6xl mx-auto px-4 flex justify-between items-center"><a href="/" className="text-2xl font-bold">{site_title}</a><nav className="flex gap-6 text-sm text-gray-600"><a href="/" className="hover:text-gray-900">Home</a><a href="/blog" className="hover:text-gray-900">Blog</a><a href="/about" className="hover:text-gray-900">About</a></nav></div></header>;
}

function Footer({ site_title }: SlotProps) {
  return <footer className="bg-gray-900 text-white py-8 mt-12"><div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-400"><p>© {new Date().getFullYear()} {site_title}</p></div></footer>;
}

function PostList({ contents }: SlotProps) {
  return <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-3 gap-8"><div className="col-span-2"><h1 className="text-3xl font-bold mb-8">Blog</h1>{contents?.map((item) => <article key={item.id} className="mb-8 pb-8 border-b"><a href={`/${item.slug}`} className="block group"><h2 className="text-2xl font-bold group-hover:text-blue-600">{item.title}</h2><div className="flex gap-4 mt-2 text-sm text-gray-500"><span>{item.author_name}</span><time>{new Date(item.created_at).toLocaleDateString()}</time></div></a></article>) || <p className="text-gray-500">No posts yet.</p>}</div><div className="col-span-1"><div className="bg-gray-50 p-6 rounded-lg sticky top-4"><h3 className="font-semibold mb-4">Categories</h3><p className="text-sm text-gray-500">Coming soon</p></div></div></div>;
}

function SinglePost({ content, taxonomies }: SlotProps) {
  if (!content) return null;
  return <article className="max-w-4xl mx-auto px-4 py-12"><header className="mb-8"><h1 className="text-4xl font-bold">{content.title}</h1><div className="flex gap-4 mt-4 text-sm text-gray-500"><span>{content.author_name}</span><time>{new Date(content.created_at).toLocaleDateString()}</time></div>{taxonomies && taxonomies.length > 0 && <div className="flex gap-2 mt-4">{taxonomies.map((t) => <span key={t.id} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">{t.name}</span>)}</div>}</header><div className="prose max-w-none"><p>{content.meta?.excerpt}</p></div></article>;
}

function Sidebar() { return <aside className="bg-gray-50 p-6 rounded-lg"><h3 className="font-semibold mb-3">About</h3><p className="text-sm text-gray-600">A clean blog theme with sidebar layout.</p></aside>; }

export default define_theme({ name: 'blog', version: '1.0.0', description: 'Clean blog theme with sidebar', slots: { header: Header, footer: Footer, post_list: PostList, single_post: SinglePost, sidebar: Sidebar } });

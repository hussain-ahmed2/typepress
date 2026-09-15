import { define_theme, type SlotProps } from '@typepress/theme-sdk';

function Header({ site_title }: SlotProps) {
  return <header className="bg-red-600 text-white py-3"><div className="max-w-7xl mx-auto px-4 flex justify-between items-center"><a href="/" className="text-2xl font-black tracking-tight">{site_title}</a><nav className="flex gap-6 text-sm font-medium"><a href="/" className="hover:text-red-200">Home</a><a href="/news" className="hover:text-red-200">News</a><a href="/tech" className="hover:text-red-200">Tech</a><a href="/culture" className="hover:text-red-200">Culture</a></nav></div></header>;
}

function Footer() {
  return <footer className="bg-gray-900 text-white py-8"><div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400"><p>© {new Date().getFullYear()} Magazine. All rights reserved.</p></div></footer>;
}

function PostList({ contents }: SlotProps) {
  const featured = contents?.[0];
  const rest = contents?.slice(1) || [];
  return <div className="max-w-7xl mx-auto px-4 py-12">{featured && <div className="mb-12"><a href={`/${featured.slug}`} className="block group"><div className="h-96 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-end p-8"><div><span className="bg-white text-red-600 px-3 py-1 rounded-full text-xs font-bold">Featured</span><h2 className="text-4xl font-black text-white mt-3 group-hover:underline">{featured.title}</h2><p className="text-white/80 mt-2">{featured.author_name} · {new Date(featured.created_at).toLocaleDateString()}</p></div></div></a></div>}<div className="grid grid-cols-3 gap-8">{rest.map((item) => <a key={item.id} href={`/${item.slug}`} className="block group"><div className="aspect-video bg-gray-200 rounded-lg mb-3" /><h3 className="font-bold group-hover:text-red-600">{item.title}</h3><p className="text-sm text-gray-500 mt-1">{item.author_name}</p></a>)}</div></div>;
}

function SinglePost({ content }: SlotProps) {
  if (!content) return null;
  return <article className="max-w-3xl mx-auto px-4 py-12"><div className="bg-red-600 h-2 rounded-full mb-8" /><h1 className="text-5xl font-black mb-4">{content.title}</h1><div className="flex gap-4 text-sm text-gray-500 mb-8"><span>{content.author_name}</span><time>{new Date(content.created_at).toLocaleDateString()}</time></div><div className="prose prose-xl max-w-none"><p className="text-xl text-gray-600">{content.meta?.excerpt}</p></div></article>;
}

export default define_theme({ name: 'magazine', version: '1.0.0', description: 'Magazine-style theme with featured content', slots: { header: Header, footer: Footer, post_list: PostList, single_post: SinglePost } });

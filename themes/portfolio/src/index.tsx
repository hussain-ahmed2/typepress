import { define_theme, type SlotProps } from '@typepress/theme-sdk';

function Header({ site_title }: SlotProps) {
  return <header className="bg-black text-white py-6"><div className="max-w-7xl mx-auto px-4 flex justify-between items-center"><a href="/" className="text-xl font-light tracking-wider">{site_title}</a><nav className="flex gap-8 text-sm"><a href="/" className="hover:text-gray-300">Work</a><a href="/about" className="hover:text-gray-300">About</a><a href="/contact" className="hover:text-gray-300">Contact</a></nav></div></header>;
}

function Footer() {
  return <footer className="bg-black text-white py-12"><div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500"><p>© {new Date().getFullYear()} All rights reserved.</p></div></footer>;
}

function PostList({ contents }: SlotProps) {
  return <div className="max-w-7xl mx-auto px-4 py-16"><h1 className="text-5xl font-light mb-12 text-center">Selected Work</h1><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{contents?.map((item, i) => <a key={item.id} href={`/${item.slug}`} className="block group relative overflow-hidden aspect-square"><div className={`absolute inset-0 bg-gradient-to-br ${i % 3 === 0 ? 'from-purple-500 to-pink-500' : i % 3 === 1 ? 'from-blue-500 to-cyan-500' : 'from-orange-500 to-red-500'} opacity-80 group-hover:opacity-100 transition-opacity`} /><div className="absolute inset-0 flex items-end p-6"><div><h3 className="text-white text-xl font-bold">{item.title}</h3><p className="text-white/70 text-sm mt-1">{item.type}</p></div></div></a>) || <p className="col-span-3 text-center text-gray-500 py-16">No work yet.</p>}</div></div>;
}

function SinglePost({ content }: SlotProps) {
  if (!content) return null;
  return <article className="max-w-4xl mx-auto px-4 py-16"><div className="h-96 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-12" /><h1 className="text-5xl font-light mb-6">{content.title}</h1><p className="text-gray-500 text-lg">{content.meta?.excerpt}</p></article>;
}

export default define_theme({ name: 'portfolio', version: '1.0.0', description: 'Creative portfolio theme with masonry grid', slots: { header: Header, footer: Footer, post_list: PostList, single_post: SinglePost } });

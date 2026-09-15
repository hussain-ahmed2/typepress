import { define_theme, type SlotProps } from '@typepress/theme-sdk';

function Header({ site_title }: SlotProps) {
  return <header className="absolute top-0 w-full z-10"><div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center"><a href="/" className="text-2xl font-bold text-white">{site_title}</a><nav className="flex gap-6 text-sm text-white/80"><a href="/features" className="hover:text-white">Features</a><a href="/pricing" className="hover:text-white">Pricing</a><a href="/docs" className="hover:text-white">Docs</a><a href="/login" className="bg-white text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100">Get Started</a></nav></div></header>;
}

function Footer() {
  return <footer className="bg-gray-900 text-white py-12"><div className="max-w-6xl mx-auto px-4 grid grid-cols-4 gap-8 text-sm"><div><h3 className="font-semibold mb-3">Product</h3><ul className="space-y-2 text-gray-400"><li><a href="/features" className="hover:text-white">Features</a></li><li><a href="/pricing" className="hover:text-white">Pricing</a></li><li><a href="/docs" className="hover:text-white">Documentation</a></li></ul></div><div><h3 className="font-semibold mb-3">Company</h3><ul className="space-y-2 text-gray-400"><li><a href="/about" className="hover:text-white">About</a></li><li><a href="/blog" className="hover:text-white">Blog</a></li><li><a href="/careers" className="hover:text-white">Careers</a></li></ul></div><div><h3 className="font-semibold mb-3">Legal</h3><ul className="space-y-2 text-gray-400"><li><a href="/privacy" className="hover:text-white">Privacy</a></li><li><a href="/terms" className="hover:text-white">Terms</a></li></ul></div><div><h3 className="font-semibold mb-3">Connect</h3><ul className="space-y-2 text-gray-400"><li><a href="https://twitter.com" className="hover:text-white">Twitter</a></li><li><a href="https://github.com" className="hover:text-white">GitHub</a></li></ul></div></div></footer>;
}

function PostList({ contents }: SlotProps) {
  return <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center"><div className="text-center text-white px-4"><h1 className="text-6xl font-bold mb-6">Build Something<br />Amazing Today</h1><p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">The modern CMS for developers who want to move fast without breaking things.</p><div className="flex gap-4 justify-center"><a href="/signup" className="bg-white text-gray-900 px-8 py-3 rounded-lg font-medium hover:bg-gray-100">Start Free Trial</a><a href="/demo" className="border border-white/30 text-white px-8 py-3 rounded-lg font-medium hover:bg-white/10">Watch Demo</a></div><div className="mt-16 grid grid-cols-3 gap-12 text-center max-w-3xl mx-auto"><div><p className="text-4xl font-bold">10x</p><p className="text-white/60 text-sm mt-1">Faster than WordPress</p></div><div><p className="text-4xl font-bold">99.9%</p><p className="text-white/60 text-sm mt-1">Uptime guaranteed</p></div><div><p className="text-4xl font-bold">50K+</p><p className="text-white/60 text-sm mt-1">Happy developers</p></div></div></div></div>;
}

function SinglePost({ content }: SlotProps) {
  if (!content) return null;
  return <article className="max-w-3xl mx-auto px-4 py-24"><h1 className="text-5xl font-bold mb-6">{content.title}</h1><p className="text-xl text-gray-600">{content.meta?.excerpt}</p></article>;
}

export default define_theme({ name: 'landing', version: '1.0.0', description: 'Minimal landing page theme', slots: { header: Header, footer: Footer, post_list: PostList, single_post: SinglePost } });

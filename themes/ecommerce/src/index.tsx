import { define_theme, type SlotProps } from '@typepress/theme-sdk';

function Header({ site_title }: SlotProps) {
  return <header className="bg-white shadow-sm sticky top-0 z-50"><div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center"><a href="/" className="text-2xl font-bold text-gray-900">{site_title}</a><nav className="flex gap-8 items-center"><a href="/shop" className="text-gray-600 hover:text-gray-900">Shop</a><a href="/categories" className="text-gray-600 hover:text-gray-900">Categories</a><button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm">Cart (0)</button></nav></div></header>;
}

function Footer() {
  return <footer className="bg-gray-900 text-white py-12"><div className="max-w-7xl mx-auto px-4 grid grid-cols-4 gap-8"><div><h3 className="font-semibold mb-3">Shop</h3><ul className="text-sm text-gray-400 space-y-2"><li><a href="/shop" className="hover:text-white">All Products</a></li><li><a href="/categories" className="hover:text-white">Categories</a></li><li><a href="/sale" className="hover:text-white">Sale</a></li></ul></div><div><h3 className="font-semibold mb-3">Account</h3><ul className="text-sm text-gray-400 space-y-2"><li><a href="/account" className="hover:text-white">My Account</a></li><li><a href="/orders" className="hover:text-white">Orders</a></li><li><a href="/wishlist" className="hover:text-white">Wishlist</a></li></ul></div><div><h3 className="font-semibold mb-3">Help</h3><ul className="text-sm text-gray-400 space-y-2"><li><a href="/shipping" className="hover:text-white">Shipping</a></li><li><a href="/returns" className="hover:text-white">Returns</a></li><li><a href="/contact" className="hover:text-white">Contact</a></li></ul></div><div><h3 className="font-semibold mb-3">Newsletter</h3><p className="text-sm text-gray-400 mb-3">Get 10% off your first order</p><div className="flex"><input type="email" placeholder="Email" className="flex-1 px-3 py-2 rounded-l-lg text-sm" /><button className="bg-blue-600 text-white px-4 py-2 rounded-r-lg text-sm">Subscribe</button></div></div></div></footer>;
}

function PostList({ contents }: SlotProps) {
  return <div className="max-w-7xl mx-auto px-4 py-12"><h1 className="text-3xl font-bold mb-8">All Products</h1><div className="grid grid-cols-2 md:grid-cols-4 gap-6">{contents?.map((item) => {  const price = 0; return <a key={item.id} href={`/${item.slug}`} className="block group"><div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-4xl">🛒</div><h3 className="font-medium group-hover:text-blue-600">{item.title}</h3><p className="text-blue-600 font-bold mt-1">${price.toFixed(2)}</p></a>; }) || <p className="col-span-4 text-center text-gray-500 py-12">No products yet.</p>}</div></div>;
}

function SinglePost({ content }: SlotProps) {
  if (!content) return null;
  const meta = content.meta as Record<string, unknown>;
  const price = 0;
  return <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-2 gap-12"><div className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center text-8xl">🛒</div><div><h1 className="text-4xl font-bold mb-4">{content.title}</h1><p className="text-3xl text-blue-600 font-bold mb-6">${price.toFixed(2)}</p><p className="text-gray-600 mb-8">{content.meta?.excerpt}</p><div className="flex gap-4"><button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700">Add to Cart</button><button className="border border-gray-300 px-8 py-3 rounded-lg font-medium hover:bg-gray-50">Buy Now</button></div></div></div>;
}

export default define_theme({ name: 'ecommerce', version: '1.0.0', description: 'E-commerce theme with product grid', slots: { header: Header, footer: Footer, post_list: PostList, single_post: SinglePost } });

/**
 * Marketplace Page — Browse and manage plugins and themes.
 */
'use client';

import { useState } from 'react';
import { Package, Palette, ExternalLink } from 'lucide-react';

interface MarketplaceItem {
  name: string;
  description: string;
  version: string;
  type: 'plugin' | 'theme';
  author: string;
  installed: boolean;
  category: string;
}

const marketplace_items: MarketplaceItem[] = [
  { name: 'SEO', description: 'Meta tags, Open Graph, structured data', version: '1.0.0', type: 'plugin', author: 'Typepress', installed: true, category: 'Marketing' },
  { name: 'Comments', description: 'Comment system with moderation', version: '1.0.0', type: 'plugin', author: 'Typepress', installed: true, category: 'Engagement' },
  { name: 'Contact Form', description: 'Configurable contact forms', version: '1.0.0', type: 'plugin', author: 'Typepress', installed: true, category: 'Forms' },
  { name: 'Analytics', description: 'Page view tracking', version: '1.0.0', type: 'plugin', author: 'Typepress', installed: true, category: 'Marketing' },
  { name: 'Social Sharing', description: 'Share buttons for social platforms', version: '1.0.0', type: 'plugin', author: 'Typepress', installed: true, category: 'Marketing' },
  { name: 'Two-Factor Auth', description: 'TOTP-based 2FA', version: '1.0.0', type: 'plugin', author: 'Typepress', installed: true, category: 'Security' },
  { name: 'Password Reset', description: 'Password reset flow', version: '1.0.0', type: 'plugin', author: 'Typepress', installed: true, category: 'Security' },
  { name: 'Products', description: 'Product management', version: '1.0.0', type: 'plugin', author: 'Typepress', installed: true, category: 'E-commerce' },
  { name: 'Cart', description: 'Shopping cart', version: '1.0.0', type: 'plugin', author: 'Typepress', installed: true, category: 'E-commerce' },
  { name: 'Checkout', description: 'Checkout with Stripe', version: '1.0.0', type: 'plugin', author: 'Typepress', installed: true, category: 'E-commerce' },
  { name: 'Orders', description: 'Order management', version: '1.0.0', type: 'plugin', author: 'Typepress', installed: true, category: 'E-commerce' },
  { name: 'Coupons', description: 'Discount codes', version: '1.0.0', type: 'plugin', author: 'Typepress', installed: true, category: 'E-commerce' },
  { name: 'Payment Gateways', description: 'Stripe, PayPal, Bank Transfer', version: '1.0.0', type: 'plugin', author: 'Typepress', installed: true, category: 'E-commerce' },
  { name: 'Shipping', description: 'Shipping zones and rates', version: '1.0.0', type: 'plugin', author: 'Typepress', installed: true, category: 'E-commerce' },
  { name: 'Tax Rates', description: 'Tax rate management', version: '1.0.0', type: 'plugin', author: 'Typepress', installed: true, category: 'E-commerce' },
  { name: 'Email Templates', description: 'Configurable email templates', version: '1.0.0', type: 'plugin', author: 'Typepress', installed: true, category: 'Communication' },
  { name: 'PDF Invoices', description: 'Invoice generation', version: '1.0.0', type: 'plugin', author: 'Typepress', installed: true, category: 'E-commerce' },
  { name: 'Subscriptions', description: 'Subscription management', version: '1.0.0', type: 'plugin', author: 'Typepress', installed: true, category: 'E-commerce' },
  { name: 'Default', description: 'Clean, minimal theme', version: '1.0.0', type: 'theme', author: 'Typepress', installed: true, category: 'Blog' },
  { name: 'Business', description: 'Professional business theme', version: '1.0.0', type: 'theme', author: 'Typepress', installed: true, category: 'Business' },
  { name: 'Blog', description: 'Blog theme with sidebar', version: '1.0.0', type: 'theme', author: 'Typepress', installed: true, category: 'Blog' },
  { name: 'Portfolio', description: 'Creative portfolio theme', version: '1.0.0', type: 'theme', author: 'Typepress', installed: true, category: 'Portfolio' },
  { name: 'E-commerce', description: 'Online store theme', version: '1.0.0', type: 'theme', author: 'Typepress', installed: true, category: 'E-commerce' },
  { name: 'Magazine', description: 'Magazine-style theme', version: '1.0.0', type: 'theme', author: 'Typepress', installed: true, category: 'Blog' },
  { name: 'Landing', description: 'Landing page theme', version: '1.0.0', type: 'theme', author: 'Typepress', installed: true, category: 'Landing' },
];

export default function MarketplacePage() {
  const [filter, set_filter] = useState<'all' | 'plugin' | 'theme'>('all');
  const [search, set_search] = useState('');

  const filtered = marketplace_items.filter((item) => {
    if (filter !== 'all' && item.type !== filter) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Marketplace</h1>

      <div className="flex gap-4 mb-6">
        <div className="flex gap-2">
          {(['all', 'plugin', 'theme'] as const).map((f) => (
            <button
              key={f}
              onClick={() => set_filter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {f === 'all' ? 'All' : f === 'plugin' ? 'Plugins' : 'Themes'}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => set_search(e.target.value)}
          placeholder="Search marketplace..."
          className="flex-1 max-w-md border border-gray-300 rounded-lg px-4 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div key={item.name} className="bg-white rounded-lg drop-shadow p-4 hover:drop-shadow-md transition-drop-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {item.type === 'plugin' ? <Package size={24} className="text-blue-500" /> : <Palette size={24} className="text-purple-500" />}
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-xs text-gray-500">{item.author} · v{item.version}</p>
                </div>
              </div>
              {item.installed && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Installed</span>}
            </div>
            <p className="text-sm text-gray-600 mt-3">{item.description}</p>
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{item.category}</span>
              <button className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                {item.installed ? 'Manage' : 'Install'} <ExternalLink size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

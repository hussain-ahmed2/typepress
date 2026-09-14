/**
 * Sidebar Component — Main navigation for the admin panel.
 *
 * Highlights the current route and provides links to all feature sections.
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav_items = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/content', label: 'Content', icon: '📝' },
  { href: '/media', label: 'Media', icon: '🖼️' },
  { href: '/taxonomy', label: 'Taxonomy', icon: '🏷️' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Typepress</h1>
        <p className="text-gray-400 text-sm">Admin Panel</p>
      </div>

      <nav className="space-y-1">
        {nav_items.map((item) => {
          const is_active = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                is_active
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

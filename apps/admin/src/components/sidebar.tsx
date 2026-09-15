/**
 * Sidebar Component — Main navigation for the admin panel.
 *
 * Uses custom color scheme:
 *   - Primary: #474f85 (dark blue/purple)
 *   - Accent: #51e3d4 (teal)
 *   - Background: #f3f9fb (light blue)
 *   - Cream: #f3ecd3 (light yellow)
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Paintbrush,
  Image,
  Tags,
  Menu,
  Users,
  Settings,
  Store,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const nav_items: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/content', label: 'Content', icon: FileText },
  { href: '/builder', label: 'Builder', icon: Paintbrush },
  { href: '/media', label: 'Media', icon: Image },
  { href: '/taxonomy', label: 'Taxonomy', icon: Tags },
  { href: '/menus', label: 'Menus', icon: Menu },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/marketplace', label: 'Marketplace', icon: Store },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 text-white min-h-screen p-4" style={{ backgroundColor: '#474f85' }}>
      <div className="mb-8">
        <h1 className="text-xl font-bold">Typepress</h1>
        <p className="text-sm" style={{ color: '#51e3d4' }}>Admin Panel</p>
      </div>

      <nav className="space-y-1">
        {nav_items.map((item) => {
          const is_active = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                is_active
                  ? 'text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
              style={is_active ? { backgroundColor: '#51e3d4', color: '#474f85' } : {}}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

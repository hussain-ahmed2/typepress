/**
 * Sidebar Component — Sticky, responsive, accessible navigation.
 *
 * Colors: #2185d5 (blue), #3a4750 (gray), #303841 (dark), #f3f3f3 (light)
 * Uses Lucide icons throughout.
 */
'use client';

import { useState } from 'react';
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
  X,
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
  const [isOpen, set_isOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => set_isOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md text-white drop-shadow"
        style={{ backgroundColor: '#2185d5' }}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={`w-64 min-h-screen p-4 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen`}
        style={{ backgroundColor: '#303841' }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white">Typepress</h1>
          <p className="text-sm" style={{ color: '#2185d5' }}>Admin Panel</p>
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
                onClick={() => set_isOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  is_active
                    ? 'text-white drop-shadow-md'
                    : 'text-gray-300 hover:text-white'
                }`}
                style={is_active ? { backgroundColor: '#2185d5' } : {}}
                aria-current={is_active ? 'page' : undefined}
              >
                <Icon size={20} className="shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => set_isOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}

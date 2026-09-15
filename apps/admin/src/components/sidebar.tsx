/**
 * Sidebar Component — Responsive, accessible navigation.
 *
 * Features:
 *   - Collapsible on mobile with hamburger toggle
 *   - Keyboard navigation support
 *   - ARIA labels for screen readers
 *   - Focus visible states
 *   - Drop shadow styling
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
      {/* Mobile hamburger button */}
      <button
        onClick={() => set_isOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg text-white"
        style={{ backgroundColor: '#6892D5' }}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 text-white min-h-screen p-4 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ backgroundColor: '#6892D5' }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="mb-8">
          <h1 className="text-xl font-bold">Typepress</h1>
          <p className="text-sm" style={{ color: '#C9FDD7' }}>Admin Panel</p>
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
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  is_active
                    ? 'text-white shadow-md'
                    : 'text-white/70 hover:text-white hover:shadow-sm'
                }`}
                style={is_active ? { backgroundColor: '#79D1C3' } : {}}
                aria-current={is_active ? 'page' : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile overlay */}
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

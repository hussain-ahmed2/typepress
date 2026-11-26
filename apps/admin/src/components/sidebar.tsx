/**
 * Sidebar Component — Sticky, responsive, accessible navigation.
 *
 * Uses semantic theme/sidebar tokens for consistent light/dark theming.
 * Lucide icons are used throughout; no emoji glyphs.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Paintbrush,
  Image,
  Tags,
  Menu,
  Users,
  Settings,
  Store,
  X,
  LogOut,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppDispatch } from '@/lib/store';
import { logout_user } from '@/lib/slices/user_slice';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const nav_items: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/content', label: 'Content', icon: FileText },
  { href: '/comments', label: 'Comments', icon: MessageSquare },
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
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isOpen, set_isOpen] = useState(false);
  const [is_logging_out, set_is_logging_out] = useState(false);

  /** Log out on server, clear client auth state, then return to login. */
  async function handle_logout(): Promise<void> {
    set_is_logging_out(true);
    try {
      await dispatch(logout_user()).unwrap();
    } catch {
      // Reducer clears local auth state on rejection; still redirect to login.
    } finally {
      set_isOpen(false);
      set_is_logging_out(false);
      router.replace('/login');
    }
  }

  return (
    <>
      <button
        onClick={() => set_isOpen(!isOpen)}
        className="fixed left-4 top-4 z-50 rounded-md bg-primary p-2 text-primary-foreground drop-shadow focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:hidden"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        type="button"
      >
        {isOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
      </button>

      <aside
        className={`flex min-h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:sticky lg:top-0 lg:h-screen lg:translate-x-0`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="mb-8">
          <h1 className="text-xl font-bold text-sidebar-foreground">Typepress</h1>
          <p className="text-sm text-sidebar-primary">Admin Panel</p>
        </div>

        <nav className="space-y-1 flex-1">
          {nav_items.map((item) => {
            const is_active = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => set_isOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/50 ${
                  is_active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground drop-shadow-md'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
                aria-current={is_active ? 'page' : undefined}
              >
                <Icon size={20} className="shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-sidebar-border pt-4">
          <button
            type="button"
            onClick={() => { void handle_logout(); }}
            disabled={is_logging_out}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/50 disabled:opacity-60"
            aria-label="Log out"
          >
            <LogOut size={20} className="shrink-0" aria-hidden="true" />
            <span>{is_logging_out ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => set_isOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}

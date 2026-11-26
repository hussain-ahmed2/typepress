/**
 * Renderer Layout — Accessible, responsive public site layout.
 *
 * Uses shadcn semantic theme tokens and provides baseline SEO metadata.
 */
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Geist } from 'next/font/google';

import { cn } from '@/lib/utils';

import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

/** Resolve the public site URL for absolute metadata URLs. */
function get_site_url(): URL {
  const raw_url = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? 'http://localhost:8002';
  try {
    return new URL(raw_url);
  } catch {
    return new URL('http://localhost:8002');
  }
}

const site_url = get_site_url();
const site_name = 'Typepress';
const site_description = 'A TypeScript-native CMS for publishing modern content.';

export const metadata: Metadata = {
  metadataBase: site_url,
  title: {
    default: site_name,
    template: `%s | ${site_name}`,
  },
  description: site_description,
  openGraph: {
    type: 'website',
    siteName: site_name,
    title: site_name,
    description: site_description,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: site_name,
    description: site_description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:drop-shadow-md focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>

        <header className="bg-primary py-4 text-primary-foreground drop-shadow-md" role="banner">
          <div className="mx-auto max-w-4xl px-4">
            <nav className="flex items-center justify-between" aria-label="Main navigation">
              <Link
                href="/"
                className="rounded-sm text-xl font-bold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                Typepress
              </Link>
              <ul className="m-0 flex list-none gap-6 p-0" role="menubar">
                <li role="none">
                  <Link
                    href="/"
                    className="rounded-sm px-2 py-1 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                    role="menuitem"
                  >
                    Home
                  </Link>
                </li>
                <li role="none">
                  <Link
                    href="/about"
                    className="rounded-sm px-2 py-1 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                    role="menuitem"
                  >
                    About
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>

        <main id="main-content" className="mx-auto min-h-[60vh] max-w-4xl px-4 py-8">
          {children}
        </main>

        <footer className="mt-12 border-t border-border py-8" role="contentinfo">
          <div className="mx-auto max-w-4xl px-4 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Typepress. Built with TypeScript.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

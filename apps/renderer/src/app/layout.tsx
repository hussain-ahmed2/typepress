/**
 * Renderer Layout — Accessible, responsive public site layout.
 *
 * Features:
 *   - Skip to content link for keyboard users
 *   - Responsive header
 *   - Semantic HTML structure
 *   - ARIA landmarks
 */
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Typepress',
  description: 'A TypeScript-native CMS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-gray-900">
        {/* Skip to content link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
        >
          Skip to content
        </a>

        <header className="py-4" style={{ backgroundColor: '#6892D5' }} role="banner">
          <div className="max-w-4xl mx-auto px-4">
            <a href="/" className="text-xl font-bold text-white">Typepress</a>
          </div>
        </header>

        <main id="main-content" role="main">
          {children}
        </main>

        <footer className="py-8 mt-12" style={{ backgroundColor: '#F8FCFB' }} role="contentinfo">
          <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
            <p>Powered by Typepress</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

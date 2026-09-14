/**
 * Renderer App — Public-facing site that renders content from the Typepress API.
 *
 * Uses Next.js App Router with SSR/ISR for content pages.
 * The [slug] dynamic route handles all content rendering.
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
      <body className="min-h-screen bg-white text-gray-900">
        <header className="border-b border-gray-200 py-4">
          <div className="max-w-4xl mx-auto px-4">
            <a href="/" className="text-xl font-bold">Typepress</a>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}

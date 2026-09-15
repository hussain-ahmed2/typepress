/**
 * Renderer App — Public-facing site that renders content from the Typepress API.
 *
 * Color scheme:
 *   - Primary: #474f85
 *   - Accent: #51e3d4
 *   - Background: #f3f9fb
 *   - Cream: #f3ecd3
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
        <header className="py-4" style={{ backgroundColor: '#474f85' }}>
          <div className="max-w-4xl mx-auto px-4">
            <a href="/" className="text-xl font-bold text-white">Typepress</a>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}

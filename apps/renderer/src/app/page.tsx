/**
 * Home Page — Public content feed.
 *
 * Server-renders published content with ISR and theme slot rendering.
 */
import type { Metadata } from 'next';

import { get_published_content } from '@/lib/api';
import { get_theme_slot } from '@/theme';

// ISR window for the home feed; keep aligned with API fetch revalidation.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Home',
  description: 'Latest published content from Typepress.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Home',
    description: 'Latest published content from Typepress.',
    url: '/',
    type: 'website',
  },
};

export default async function HomePage() {
  const contents = await get_published_content({ status: 'PUBLISHED', limit: 20 });
  const PostListSlot = get_theme_slot('post_list');

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Typepress</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Latest Posts</h1>
        <p className="max-w-2xl text-muted-foreground">
          Stories, updates, and published content from the CMS.
        </p>
      </header>

      <PostListSlot
        contents={contents}
        site_title="Typepress"
        site_description="A TypeScript-native CMS for publishing modern content."
      />
    </section>
  );
}

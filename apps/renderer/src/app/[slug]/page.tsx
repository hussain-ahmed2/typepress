/**
 * Content Page — Public single-content route.
 *
 * Renders published content by slug with ISR, SEO metadata, and theme slots.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { get_content_by_slug } from '@/lib/api';
import { get_theme_slot } from '@/theme';

// ISR window for content detail; keep aligned with API fetch revalidation.
export const revalidate = 60;

interface ContentPageProps {
  params: Promise<{ slug: string }>;
}

/** Build SEO metadata for a content item. */
export async function generateMetadata({ params }: ContentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const content = await get_content_by_slug(slug);

  if (!content || content.status !== 'PUBLISHED') {
    return {
      title: 'Content not found',
      description: 'The requested content could not be found.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const description =
    typeof content.meta.excerpt === 'string' && content.meta.excerpt.trim().length > 0
      ? content.meta.excerpt
      : `Read ${content.title} on Typepress.`;
  const canonical_path = `/${content.slug}`;

  return {
    title: content.title,
    description,
    alternates: {
      canonical: canonical_path,
    },
    openGraph: {
      type: 'article',
      title: content.title,
      description,
      url: canonical_path,
      publishedTime: content.created_at,
      modifiedTime: content.updated_at,
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description,
    },
  };
}

export default async function ContentPage({ params }: ContentPageProps) {
  const { slug } = await params;
  const content = await get_content_by_slug(slug);

  // Only published content is publicly renderable.
  if (!content || content.status !== 'PUBLISHED') {
    notFound();
  }

  const SinglePostSlot = get_theme_slot('single_post');

  return (
    <SinglePostSlot
      content={content}
      taxonomies={content.taxonomies}
      site_title="Typepress"
      site_description="A TypeScript-native CMS for publishing modern content."
    />
  );
}

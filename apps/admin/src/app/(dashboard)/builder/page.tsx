/**
 * Builder Page — Visual drag-and-drop page builder.
 *
 * Uses a client-only editor to avoid SSR issues with browser-only DnD APIs.
 * Saves builder state as JSON in Content.meta.builder_data.
 */
'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const BuilderContent = dynamic(() => import('@/components/builder/builder_content'), {
  ssr: false,
  loading: () => (
    <div className="space-y-4 px-4 sm:px-6 lg:px-8" aria-label="Loading page builder">
      <Skeleton className="h-8 w-48 rounded-md" />
      <Skeleton className="h-[32rem] w-full rounded-md" />
    </div>
  ),
});

/** Page builder route entry. */
export default function BuilderPage() {
  return <BuilderContent />;
}

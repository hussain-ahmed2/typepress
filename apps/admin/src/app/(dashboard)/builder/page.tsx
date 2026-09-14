/**
 * Builder Page — Visual drag-and-drop page builder.
 *
 * Uses Craft.js for the editor experience.
 * Saves builder state as JSON in Content.meta.builder_data.
 *
 * Wrapped in dynamic import to prevent SSR issues with Craft.js.
 */
'use client';

import dynamic from 'next/dynamic';

const BuilderContent = dynamic(() => import('@/components/builder/builder_content'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <p className="text-gray-500">Loading builder...</p>
    </div>
  ),
});

export default function BuilderPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Page Builder</h1>
      </div>
      <BuilderContent />
    </div>
  );
}

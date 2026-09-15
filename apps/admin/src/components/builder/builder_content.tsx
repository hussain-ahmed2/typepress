/**
 * Builder Content — Uses our custom block editor (React 19 compatible).
 *
 * No Craft.js dependency — built from scratch for full control.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api_client';
import { BlockEditor, type Block } from './block_editor';
import { ResponsivePreview } from './preview/responsive_preview';

export default function BuilderContent() {
  const router = useRouter();
  const [blocks] = useState<Block[]>([]);
  const [saving, set_saving] = useState(false);

  async function handle_save() {
    set_saving(true);
    const meta = { builder_data: blocks };

    const result = await api.post('/api/content', {
      type: 'page',
      slug: `page-${Date.now()}`,
      title: 'Builder Page',
      status: 'DRAFT',
      meta,
    });

    set_saving(false);

    if (result.success) {
      router.push('/content');
    } else {
      alert(result.error?.message || 'Failed to save');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold" style={{ color: '#303841' }}>Page Builder</h1>
        <button
          onClick={handle_save}
          disabled={saving}
          className="text-white px-6 py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#2185d5' }}
        >
          {saving ? 'Saving...' : 'Save Page'}
        </button>
      </div>

      <ResponsivePreview>
        <BlockEditor initial_blocks={blocks} />
      </ResponsivePreview>
    </div>
  );
}

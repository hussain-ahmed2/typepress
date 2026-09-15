/**
 * Builder Content — Gutenberg-style page builder.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api_client';
import { BlockEditor } from './block_editor';

export default function BuilderContent() {
  const router = useRouter();
  const [saving, set_saving] = useState(false);

  async function handle_save() {
    set_saving(true);
    const result = await api.post('/api/content', {
      type: 'page',
      slug: `page-${Date.now()}`,
      title: 'Builder Page',
      status: 'DRAFT',
      meta: { builder_data: [] },
    });
    set_saving(false);
    if (result.success) router.push('/content');
    else alert(result.error?.message || 'Failed to save');
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Page Builder</h1>
        <button onClick={handle_save} disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </header>
      <div className="flex-1 overflow-hidden">
        <BlockEditor />
      </div>
    </div>
  );
}

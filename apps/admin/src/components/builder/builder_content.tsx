/**
 * Builder Content — The actual Craft.js editor (client-only).
 *
 * Separated from the page component to prevent SSR issues.
 */
'use client';

import { Editor, Frame, Element, useEditor } from '@craftjs/core';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api_client';
import { Toolbox } from './toolbox';
import { SettingsPanel } from './settings_panel';
import { ResponsivePreview } from './preview/responsive_preview';
import { block_resolver } from './blocks';
import { ContainerBlock } from './blocks/container_block';

function SaveButton() {
  const { query } = useEditor();
  const router = useRouter();
  const [saving, set_saving] = useState(false);

  async function handle_save() {
    set_saving(true);
    const json = query.serialize();
    const meta = { builder_data: JSON.parse(json) };

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
    <button
      onClick={handle_save}
      disabled={saving}
      className="style={{ backgroundColor: "#2185d5" }} text-white px-6 py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
    >
      {saving ? 'Saving...' : 'Save Page'}
    </button>
  );
}

export default function BuilderContent() {
  return (
    <Editor resolver={block_resolver}>
      <div className="flex gap-6">
        {/* Toolbox */}
        <div className="w-64 flex-shrink-0">
          <Toolbox />
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <ResponsivePreview>
            <Frame>
              <Element is={ContainerBlock} canvas background="#ffffff" padding={24} flexDirection="column" gap={16}>
                <Element
                  is="div"
                  canvas
                  style={{ padding: '40px 20px', textAlign: 'center' }}
                >
                  <p className="text-gray-400">
                    Drag blocks from the toolbox to start building
                  </p>
                </Element>
              </Element>
            </Frame>
          </ResponsivePreview>

          <div className="mt-4 flex justify-end">
            <SaveButton />
          </div>
        </div>

        {/* Settings Panel */}
        <div className="w-72 flex-shrink-0">
          <SettingsPanel />
        </div>
      </div>
    </Editor>
  );
}

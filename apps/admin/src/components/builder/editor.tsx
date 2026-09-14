/**
 * Builder Editor — Main Craft.js editor wrapper for the visual builder.
 *
 * Integrates the Editor, Frame, Toolbox, SettingsPanel, and ResponsivePreview
 * into a complete page builder experience.
 */
'use client';

import { Editor, Frame, Element } from '@craftjs/core';
import { Toolbox } from './toolbox';
import { SettingsPanel } from './settings_panel';
import { ResponsivePreview } from './preview/responsive_preview';
import { block_resolver } from './blocks';
import { ContainerBlock } from './blocks/container_block';

interface BuilderEditorProps {
  initial_data?: string;
  onSave?: (json: string) => void;
}

export function BuilderEditor({ onSave }: BuilderEditorProps) {
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
                {/* Default content or loaded from initial_data */}
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

          {/* Save button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                // Serialization will be handled by the page component
                onSave?.('');
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
            >
              Save Page
            </button>
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

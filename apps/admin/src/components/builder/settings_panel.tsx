/**
 * Settings Panel — Property editor for the selected block.
 *
 * Displays editable properties based on the selected block type.
 * Uses Craft.js useEditor to track selection and useNode to modify props.
 * Uses Lucide React icons for UI elements.
 */
'use client';

import React from 'react';
import { useEditor } from '@craftjs/core';
import { Trash2 } from 'lucide-react';
import { TextBlockSettings } from './blocks/text_block_settings';
import { ImageBlockSettings } from './blocks/image_block_settings';
import { ButtonBlockSettings } from './blocks/button_block_settings';
import { ContainerBlockSettings } from './blocks/container_block_settings';
import { HeadingBlockSettings } from './blocks/heading_block_settings';
import { DividerBlockSettings } from './blocks/divider_block_settings';

const settings_map: Record<string, React.ComponentType> = {
  TextBlock: TextBlockSettings,
  ImageBlock: ImageBlockSettings,
  ButtonBlock: ButtonBlockSettings,
  ContainerBlock: ContainerBlockSettings,
  HeadingBlock: HeadingBlockSettings,
  DividerBlock: DividerBlockSettings,
};

export function SettingsPanel() {
  const { actions, selected } = useEditor((state) => {
    const [currentNodeId] = state.events.selected;
    let selected;

    if (currentNodeId && state.nodes[currentNodeId]) {
      const node = state.nodes[currentNodeId];
      selected = {
        id: currentNodeId,
        name: node.data.name,
        isDeletable: node.data.parent !== undefined,
      };
    }

    return { selected };
  });

  if (!selected) {
    return (
      <div className="bg-white rounded-md drop-shadow p-4">
        <p className="text-sm text-gray-500">Select a block to edit its properties</p>
      </div>
    );
  }

  const SettingsComponent = settings_map[selected.name];

  return (
    <div className="bg-white rounded-md drop-shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{selected.name}</h3>
        <button
          onClick={() => actions.delete(selected.id)}
          className="text-red-600 hover:text-red-800 p-1"
          title="Delete block"
        >
          <Trash2 size={16} />
        </button>
      </div>
      {SettingsComponent && <SettingsComponent />}
    </div>
  );
}

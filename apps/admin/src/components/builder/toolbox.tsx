/**
 * Toolbox Component — Drag-to-add block palette for the visual builder.
 *
 * Displays available blocks that can be dragged onto the canvas.
 * Uses Craft.js useEditor hook with connectors.create to instantiate blocks.
 * Uses Lucide React icons for block type indicators.
 */
'use client';

import { useEditor, Element } from '@craftjs/core';
import type { ReactElement } from 'react';
import { block_registry } from './blocks';
import { ContainerBlock } from './blocks/container_block';
import { TextBlock } from './blocks/text_block';
import { ImageBlock } from './blocks/image_block';
import { ButtonBlock } from './blocks/button_block';
import { HeadingBlock } from './blocks/heading_block';
import { DividerBlock } from './blocks/divider_block';

const block_components: Record<string, ReactElement> = {
  TextBlock: <TextBlock text="Text" fontSize={16} color="#000000" textAlign="left" fontWeight="normal" />,
  HeadingBlock: <HeadingBlock text="Heading" level={2} fontSize={32} color="#111827" textAlign="left" />,
  ImageBlock: <ImageBlock src="" alt="Image" width="100%" alignment="center" />,
  ButtonBlock: <ButtonBlock text="Click me" variant="solid" color="#3b82f6" link="" borderRadius={8} />,
  ContainerBlock: <Element is={ContainerBlock} canvas background="#ffffff" padding={16} flexDirection="column" gap={12} />,
  DividerBlock: <DividerBlock style="solid" color="#e5e7eb" thickness={1} margin={16} />,
};

export function Toolbox() {
  const { connectors } = useEditor();

  return (
    <div className="bg-white rounded-md drop-shadow p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Blocks</h3>
      <div className="space-y-2">
        {block_registry.map((block) => {
          const Icon = block.icon;
          return (
            <div
              key={block.type}
              ref={(ref) => {
                const component = block_components[block.type];
                if (ref && component) {
                  connectors.create(ref, component);
                }
              }}
              className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 cursor-grab hover:border-[#2185d5] hover:bg-[#f3f3f3] transition-colors"
            >
              <Icon size={20} className="text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">{block.name}</p>
                <p className="text-xs text-gray-500">{block.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

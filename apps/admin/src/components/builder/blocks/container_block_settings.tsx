/**
 * Container Block Settings — Property editor for container blocks.
 */
'use client';

import { useNode } from '@craftjs/core';
import type { ContainerBlockProps } from './container_block';

export function ContainerBlockSettings() {
  const { actions: { setProp }, background, padding, flexDirection, gap } = useNode((node) => ({
    background: node.data.props.background,
    padding: node.data.props.padding,
    flexDirection: node.data.props.flexDirection,
    gap: node.data.props.gap,
  }));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Background</label>
        <input
          type="color"
          value={background}
          onChange={(e) => setProp((props: ContainerBlockProps) => { props.background = e.target.value; })}
          className="w-full h-8 rounded"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Padding</label>
        <input
          type="range"
          min="0"
          max="100"
          value={padding}
          onChange={(e) => setProp((props: ContainerBlockProps) => { props.padding = Number(e.target.value); })}
          className="w-full"
        />
        <span className="text-xs text-gray-500">{padding}px</span>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Direction</label>
        <select
          value={flexDirection}
          onChange={(e) => setProp((props: ContainerBlockProps) => { props.flexDirection = e.target.value as ContainerBlockProps['flexDirection']; })}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        >
          <option value="column">Vertical</option>
          <option value="row">Horizontal</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Gap</label>
        <input
          type="range"
          min="0"
          max="50"
          value={gap}
          onChange={(e) => setProp((props: ContainerBlockProps) => { props.gap = Number(e.target.value); })}
          className="w-full"
        />
        <span className="text-xs text-gray-500">{gap}px</span>
      </div>
    </div>
  );
}

/**
 * Divider Block Settings — Property editor for divider blocks.
 */
'use client';

import { useNode } from '@craftjs/core';
import type { DividerBlockProps } from './divider_block';

export function DividerBlockSettings() {
  const { actions: { setProp }, style, color, thickness, margin } = useNode((node) => ({
    style: node.data.props.style,
    color: node.data.props.color,
    thickness: node.data.props.thickness,
    margin: node.data.props.margin,
  }));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Style</label>
        <select
          value={style}
          onChange={(e) => setProp((props: DividerBlockProps) => { props.style = e.target.value as DividerBlockProps['style']; })}
          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setProp((props: DividerBlockProps) => { props.color = e.target.value; })}
          className="w-full h-8 rounded"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Thickness</label>
        <input
          type="range"
          min="1"
          max="10"
          value={thickness}
          onChange={(e) => setProp((props: DividerBlockProps) => { props.thickness = Number(e.target.value); })}
          className="w-full"
        />
        <span className="text-xs text-gray-500">{thickness}px</span>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Margin</label>
        <input
          type="range"
          min="0"
          max="50"
          value={margin}
          onChange={(e) => setProp((props: DividerBlockProps) => { props.margin = Number(e.target.value); })}
          className="w-full"
        />
        <span className="text-xs text-gray-500">{margin}px</span>
      </div>
    </div>
  );
}

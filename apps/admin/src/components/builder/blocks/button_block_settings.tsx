/**
 * Button Block Settings — Property editor for button blocks.
 */
'use client';

import { useNode } from '@craftjs/core';
import type { ButtonBlockProps } from './button_block';

export function ButtonBlockSettings() {
  const { actions: { setProp }, text, variant, color, link, borderRadius } = useNode((node) => ({
    text: node.data.props.text,
    variant: node.data.props.variant,
    color: node.data.props.color,
    link: node.data.props.link,
    borderRadius: node.data.props.borderRadius,
  }));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Text</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setProp((props: ButtonBlockProps) => { props.text = e.target.value; })}
          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Link URL</label>
        <input
          type="text"
          value={link}
          onChange={(e) => setProp((props: ButtonBlockProps) => { props.link = e.target.value; })}
          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
          placeholder="https://..."
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Style</label>
        <select
          value={variant}
          onChange={(e) => setProp((props: ButtonBlockProps) => { props.variant = e.target.value as ButtonBlockProps['variant']; })}
          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
        >
          <option value="solid">Solid</option>
          <option value="outline">Outline</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setProp((props: ButtonBlockProps) => { props.color = e.target.value; })}
          className="w-full h-8 rounded"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Border Radius</label>
        <input
          type="range"
          min="0"
          max="50"
          value={borderRadius}
          onChange={(e) => setProp((props: ButtonBlockProps) => { props.borderRadius = Number(e.target.value); })}
          className="w-full"
        />
        <span className="text-xs text-gray-500">{borderRadius}px</span>
      </div>
    </div>
  );
}

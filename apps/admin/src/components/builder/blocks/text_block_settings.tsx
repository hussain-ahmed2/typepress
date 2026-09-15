/**
 * Text Block Settings — Property editor for text blocks.
 */
'use client';

import { useNode } from '@craftjs/core';
import type { TextBlockProps } from './text_block';

export function TextBlockSettings() {
  const { actions: { setProp }, fontSize, color, textAlign, fontWeight } = useNode((node) => ({
    fontSize: node.data.props.fontSize,
    color: node.data.props.color,
    textAlign: node.data.props.textAlign,
    fontWeight: node.data.props.fontWeight,
  }));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Font Size</label>
        <input
          type="range"
          min="12"
          max="72"
          value={fontSize}
          onChange={(e) => setProp((props: TextBlockProps) => { props.fontSize = Number(e.target.value); })}
          className="w-full"
        />
        <span className="text-xs text-gray-500">{fontSize}px</span>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setProp((props: TextBlockProps) => { props.color = e.target.value; })}
          className="w-full h-8 rounded"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Alignment</label>
        <select
          value={textAlign}
          onChange={(e) => setProp((props: TextBlockProps) => { props.textAlign = e.target.value as TextBlockProps['textAlign']; })}
          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Weight</label>
        <select
          value={fontWeight}
          onChange={(e) => setProp((props: TextBlockProps) => { props.fontWeight = e.target.value as TextBlockProps['fontWeight']; })}
          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
        >
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
        </select>
      </div>
    </div>
  );
}

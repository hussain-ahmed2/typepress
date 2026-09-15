/**
 * Heading Block Settings — Property editor for heading blocks.
 */
'use client';

import { useNode } from '@craftjs/core';
import type { HeadingBlockProps } from './heading_block';

export function HeadingBlockSettings() {
  const { actions: { setProp }, level, fontSize, color, textAlign } = useNode((node) => ({
    level: node.data.props.level,
    fontSize: node.data.props.fontSize,
    color: node.data.props.color,
    textAlign: node.data.props.textAlign,
  }));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Level</label>
        <select
          value={level}
          onChange={(e) => setProp((props: HeadingBlockProps) => { props.level = Number(e.target.value) as HeadingBlockProps['level']; })}
          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
        >
          <option value={1}>H1</option>
          <option value={2}>H2</option>
          <option value={3}>H3</option>
          <option value={4}>H4</option>
          <option value={5}>H5</option>
          <option value={6}>H6</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Font Size</label>
        <input
          type="range"
          min="16"
          max="96"
          value={fontSize}
          onChange={(e) => setProp((props: HeadingBlockProps) => { props.fontSize = Number(e.target.value); })}
          className="w-full"
        />
        <span className="text-xs text-gray-500">{fontSize}px</span>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setProp((props: HeadingBlockProps) => { props.color = e.target.value; })}
          className="w-full h-8 rounded"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Alignment</label>
        <select
          value={textAlign}
          onChange={(e) => setProp((props: HeadingBlockProps) => { props.textAlign = e.target.value as HeadingBlockProps['textAlign']; })}
          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
    </div>
  );
}

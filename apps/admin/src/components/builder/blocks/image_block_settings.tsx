/**
 * Image Block Settings — Property editor for image blocks.
 */
'use client';

import { useNode } from '@craftjs/core';
import type { ImageBlockProps } from './image_block';

export function ImageBlockSettings() {
  const { actions: { setProp }, src, alt, width, alignment } = useNode((node) => ({
    src: node.data.props.src,
    alt: node.data.props.alt,
    width: node.data.props.width,
    alignment: node.data.props.alignment,
  }));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Image URL</label>
        <input
          type="text"
          value={src}
          onChange={(e) => setProp((props: ImageBlockProps) => { props.src = e.target.value; })}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          placeholder="https://example.com/image.jpg"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Alt Text</label>
        <input
          type="text"
          value={alt}
          onChange={(e) => setProp((props: ImageBlockProps) => { props.alt = e.target.value; })}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Width</label>
        <input
          type="text"
          value={width}
          onChange={(e) => setProp((props: ImageBlockProps) => { props.width = e.target.value; })}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          placeholder="100%"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Alignment</label>
        <select
          value={alignment}
          onChange={(e) => setProp((props: ImageBlockProps) => { props.alignment = e.target.value as ImageBlockProps['alignment']; })}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
    </div>
  );
}

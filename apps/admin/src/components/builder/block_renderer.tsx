/**
 * Block Renderer — Renders blocks based on their type and props.
 *
 * Clean, minimal rendering like Gutenberg.
 */
'use client';

import type { Block } from './block_editor';

export function BlockRenderer({ block }: { block: Block }) {
  const { type, props } = block;

  switch (type) {
    case 'heading':
      return (
        <h2 className="font-bold" style={{
          fontSize: `${props.fontSize || 32}px`,
          color: String(props.color || '#1e293b'),
          textAlign: (props.textAlign || 'left') as 'left' | 'center' | 'right',
        }}>
          {String(props.text || 'Heading')}
        </h2>
      );

    case 'text':
      return (
        <p className="leading-relaxed" style={{
          fontSize: `${props.fontSize || 16}px`,
          color: String(props.color || '#475569'),
          textAlign: (props.textAlign || 'left') as 'left' | 'center' | 'right',
        }}>
          {String(props.text || 'Text')}
        </p>
      );

    case 'image':
      return props.src ? (
        <img src={String(props.src)} alt={String(props.alt || '')} style={{ width: String(props.width || '100%') }} className="rounded-md" />
      ) : (
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-md p-12 text-center text-gray-400">
          Click to add image
        </div>
      );

    case 'button':
      return (
        <button className="px-6 py-2.5 rounded-md font-medium text-white transition-colors hover:opacity-90" style={{ backgroundColor: String(props.color || '#2563eb') }}>
          {String(props.text || 'Button')}
        </button>
      );

    case 'divider':
      return (
        <hr className="my-4" style={{ border: 'none', borderTop: `${props.thickness || 1}px ${props.style || 'solid'} ${props.color || '#e2e8f0'}` }} />
      );

    case 'container':
      return (
        <div style={{ background: String(props.background || '#f8fafc'), padding: `${props.padding || 16}px`, minHeight: '60px' }} className="rounded-md border border-dashed border-gray-300">
          <p className="text-gray-400 text-sm text-center">Container</p>
        </div>
      );

    default:
      return <div className="text-gray-400">Unknown: {type}</div>;
  }
}

/**
 * Block Renderer — Renders blocks based on their type and props.
 */
'use client';

import type { Block } from './block_editor';

export function BlockRenderer({ block }: { block: Block }) {
  const { type, props } = block;

  switch (type) {
    case 'heading':
      return (
        <h2 style={{
          fontSize: `${props.fontSize || 32}px`,
          color: String(props.color || '#1E293B'),
          textAlign: (props.textAlign || 'left') as 'left' | 'center' | 'right',
        }}>
          {String(props.text || 'Heading')}
        </h2>
      );

    case 'text':
      return (
        <p style={{
          fontSize: `${props.fontSize || 16}px`,
          color: String(props.color || '#64748B'),
          textAlign: (props.textAlign || 'left') as 'left' | 'center' | 'right',
        }}>
          {String(props.text || 'Text')}
        </p>
      );

    case 'image':
      return props.src ? (
        <img
          src={String(props.src)}
          alt={String(props.alt || '')}
          style={{ width: String(props.width || '100%'), borderRadius: '6px' }}
        />
      ) : (
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-md p-8 text-center" style={{ color: '#3a4750' }}>
          Image placeholder
        </div>
      );

    case 'button':
      return (
        <button
          style={{
            backgroundColor: String(props.color || '#2185d5'),
            color: '#ffffff',
            padding: '10px 24px',
            borderRadius: `${props.borderRadius || 6}px`,
            border: 'none',
            fontWeight: 'bold',
          }}
        >
          {String(props.text || 'Button')}
        </button>
      );

    case 'divider':
      return (
        <hr style={{
          border: 'none',
          borderTop: `${props.thickness || 1}px ${props.style || 'solid'} ${props.color || '#e5e7eb'}`,
          margin: `${props.margin || 16}px 0`,
        }} />
      );

    case 'container':
      return (
        <div style={{
          background: String(props.background || '#f9fafb'),
          padding: `${props.padding || 16}px`,
          borderRadius: '6px',
          minHeight: '40px',
          border: '1px dashed #d1d5db',
        }}>
          <p style={{ color: '#3a4750', textAlign: 'center', fontSize: '12px' }}>Container</p>
        </div>
      );

    default:
      return <div style={{ color: '#3a4750' }}>Unknown: {type}</div>;
  }
}

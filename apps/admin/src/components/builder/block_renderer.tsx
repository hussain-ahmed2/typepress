/**
 * Block Renderer — Renders builder blocks based on type and props.
 *
 * Block color defaults are content defaults (user-editable), not UI theme tokens.
 */
'use client';

import type { Block } from './block_editor';

/** Renders a single block preview on the builder canvas. */
export function BlockRenderer({ block }: { block: Block }) {
  const { type, props } = block;

  switch (type) {
    case 'heading':
      return (
        <h2
          className="font-bold"
          style={{
            fontSize: `${Number(props.fontSize) || 32}px`,
            // Content default color; overridden by block settings.
            color: String(props.color || '#1e293b'),
            textAlign: (props.textAlign || 'left') as 'left' | 'center' | 'right',
          }}
        >
          {String(props.text || 'Heading')}
        </h2>
      );

    case 'text':
      return (
        <p
          className="leading-relaxed"
          style={{
            fontSize: `${Number(props.fontSize) || 16}px`,
            // Content default color; overridden by block settings.
            color: String(props.color || '#475569'),
            textAlign: (props.textAlign || 'left') as 'left' | 'center' | 'right',
          }}
        >
          {String(props.text || 'Text')}
        </p>
      );

    case 'image':
      return props.src ? (
        <img
          src={String(props.src)}
          alt={String(props.alt || '')}
          style={{ width: String(props.width || '100%') }}
          className="rounded-md"
        />
      ) : (
        <div className="rounded-md border-2 border-dashed border-border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          Click to add image
        </div>
      );

    case 'button':
      return (
        <button
          type="button"
          className="rounded-md px-6 py-2.5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
          style={{
            // Content default color; overridden by block settings.
            backgroundColor: String(props.color || '#2563eb'),
          }}
        >
          {String(props.text || 'Button')}
        </button>
      );

    case 'divider':
      return (
        <hr
          className="my-4"
          style={{
            border: 'none',
            // Content default divider style; overridden by block settings.
            borderTop: `${Number(props.thickness) || 1}px ${String(props.style || 'solid')} ${String(props.color || '#e2e8f0')}`,
          }}
        />
      );

    case 'container':
      return (
        <div
          style={{
            // Content default background; overridden by block settings.
            background: String(props.background || '#f8fafc'),
            padding: `${Number(props.padding) || 16}px`,
            minHeight: '60px',
          }}
          className="rounded-md border border-dashed border-border"
        >
          <p className="py-4 text-center text-sm text-muted-foreground">Container</p>
        </div>
      );

    default:
      return <div className="text-sm text-muted-foreground">Unknown block: {type}</div>;
  }
}

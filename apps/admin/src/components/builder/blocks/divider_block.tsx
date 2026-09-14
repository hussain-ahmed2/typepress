/**
 * Divider Block — Horizontal rule for the visual builder.
 *
 * Supports style (solid/dashed/dotted), color, and thickness.
 * Properties: style, color, thickness, margin
 */
'use client';

import { useNode } from '@craftjs/core';

export interface DividerBlockProps {
  style: 'solid' | 'dashed' | 'dotted';
  color: string;
  thickness: number;
  margin: number;
}

export function DividerBlock({ style, color, thickness, margin }: DividerBlockProps) {
  const { connectors: { connect, drag } } = useNode();

  return (
    <div ref={(ref) => { if (ref) connect(drag(ref)); }} style={{ margin: `${margin}px 0` }}>
      <hr
        style={{
          border: 'none',
          borderTop: `${thickness}px ${style} ${color}`,
          margin: 0,
        }}
      />
    </div>
  );
}

DividerBlock.craft = {
  props: {
    style: 'solid' as const,
    color: '#e5e7eb',
    thickness: 1,
    margin: 16,
  } as DividerBlockProps,
  related: {},
};

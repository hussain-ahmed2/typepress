/**
 * Container Block — Flex/grid container for the visual builder.
 *
 * Wraps child blocks with configurable background, padding, and layout.
 * Compatible with React 19 (no ref access on Element).
 */
'use client';

import { useNode } from '@craftjs/core';

export interface ContainerBlockProps {
  background: string;
  padding: number;
  flexDirection: 'row' | 'column';
  gap: number;
}

function ContainerInner({ background, padding, flexDirection, gap }: ContainerBlockProps) {
  const { connectors: { connect, drag } } = useNode();

  return (
    <div
      ref={(ref) => { if (ref) connect(drag(ref)); }}
      style={{
        background,
        padding: `${padding}px`,
        display: 'flex',
        flexDirection,
        gap: `${gap}px`,
        minHeight: '60px',
        border: '1px dashed #e5e7eb',
        borderRadius: '6px',
      }}
    >
      <div className="flex-1 min-h-[40px] flex items-center justify-center">
        <p className="text-gray-400 text-sm text-center py-4">
          Drag blocks here
        </p>
      </div>
    </div>
  );
}

export function ContainerBlock(props: ContainerBlockProps) {
  return <ContainerInner {...props} />;
}

ContainerBlock.craft = {
  props: {
    background: '#ffffff',
    padding: 16,
    flexDirection: 'column',
    gap: 12,
  } as ContainerBlockProps,
  related: {},
};

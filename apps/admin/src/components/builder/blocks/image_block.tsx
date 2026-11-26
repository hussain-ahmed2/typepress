/**
 * Image Block — Image display block for the visual builder.
 *
 * Supports src, alt text, width, and alignment.
 * Properties: src, alt, width, alignment
 */
'use client';

import { useNode } from '@craftjs/core';

export interface ImageBlockProps {
  src: string;
  alt: string;
  width: string;
  alignment: 'left' | 'center' | 'right';
}

export function ImageBlock({ src, alt, width, alignment }: ImageBlockProps) {
  const { connectors: { connect, drag } } = useNode();

  if (!src) {
    return (
      <div
        ref={(ref) => { if (ref) connect(drag(ref)); }}
        className="rounded-md border-2 border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground"
      >
        Click to add image
      </div>
    );
  }

  return (
    <div
      ref={(ref) => { if (ref) connect(drag(ref)); }}
      style={{ textAlign: alignment }}
    >
      <img
        src={src}
        alt={alt}
        style={{ width, maxWidth: '100%' }}
        className="rounded-md"
      />
    </div>
  );
}

ImageBlock.craft = {
  props: {
    src: '',
    alt: 'Image',
    width: '100%',
    alignment: 'center',
  } as ImageBlockProps,
  related: {},
};

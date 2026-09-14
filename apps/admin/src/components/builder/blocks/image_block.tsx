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
        className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500"
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
        className="rounded-lg"
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

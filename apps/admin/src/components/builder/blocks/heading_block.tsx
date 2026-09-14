/**
 * Heading Block — Headline text block for the visual builder.
 *
 * Supports h1-h6 tags with configurable font size and alignment.
 * Properties: text, level, fontSize, color, textAlign
 */
'use client';

import { useNode } from '@craftjs/core';

export interface HeadingBlockProps {
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  fontSize: number;
  color: string;
  textAlign: 'left' | 'center' | 'right';
}

export function HeadingBlock({ text, level, fontSize, color, textAlign }: HeadingBlockProps) {
  const {
    connectors: { connect, drag },
    actions: { setProp },
  } = useNode();

  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  return (
    <div ref={(ref) => { if (ref) connect(drag(ref)); }}>
      <Tag
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          setProp((props: HeadingBlockProps) => {
            props.text = e.currentTarget.textContent || '';
          });
        }}
        style={{
          fontSize: `${fontSize}px`,
          color,
          textAlign,
          margin: 0,
          fontWeight: 'bold',
        }}
      >
        {text}
      </Tag>
    </div>
  );
}

HeadingBlock.craft = {
  props: {
    text: 'Heading',
    level: 2 as const,
    fontSize: 32,
    color: '#111827',
    textAlign: 'left',
  } as HeadingBlockProps,
  related: {},
};

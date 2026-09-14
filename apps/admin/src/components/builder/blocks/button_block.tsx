/**
 * Button Block — Clickable button for the visual builder.
 *
 * Supports text, variant (solid/outline), color, and link URL.
 * Properties: text, variant, color, link, borderRadius
 */
'use client';

import { useNode } from '@craftjs/core';

export interface ButtonBlockProps {
  text: string;
  variant: 'solid' | 'outline';
  color: string;
  link: string;
  borderRadius: number;
}

export function ButtonBlock({ text, variant, color, link, borderRadius }: ButtonBlockProps) {
  const { connectors: { connect, drag } } = useNode();

  const base_styles = {
    borderRadius: `${borderRadius}px`,
    border: variant === 'outline' ? `2px solid ${color}` : 'none',
    backgroundColor: variant === 'solid' ? color : 'transparent',
    color: variant === 'solid' ? '#ffffff' : color,
    padding: '10px 24px',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
  };

  return (
    <div ref={(ref) => { if (ref) connect(drag(ref)); }}>
      {link ? (
        <a href={link} style={base_styles} className="inline-block no-underline">
          {text}
        </a>
      ) : (
        <button style={base_styles}>{text}</button>
      )}
    </div>
  );
}

ButtonBlock.craft = {
  props: {
    text: 'Click me',
    variant: 'solid',
    color: '#3b82f6',
    link: '',
    borderRadius: 8,
  } as ButtonBlockProps,
  related: {},
};

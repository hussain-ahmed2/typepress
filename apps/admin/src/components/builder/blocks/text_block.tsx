/**
 * Text Block — Editable text block for the visual builder.
 *
 * Supports inline editing via contenteditable.
 * Properties: text, fontSize, color, textAlign, fontWeight
 */
'use client';

import { useState, useEffect } from 'react';
import { useNode } from '@craftjs/core';

export interface TextBlockProps {
  text: string;
  fontSize: number;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'bold';
}

export function TextBlock({
  text: initial_text,
  fontSize,
  color,
  textAlign,
  fontWeight,
}: TextBlockProps) {
  const {
    connectors: { connect, drag },
    hasSelectedNode,
    actions: { setProp },
  } = useNode((state) => ({
    hasSelectedNode: state.events.selected,
  }));

  const [editable, set_editable] = useState(false);
  const [text, set_text] = useState(initial_text);

  useEffect(() => {
    if (!hasSelectedNode) set_editable(false);
  }, [hasSelectedNode]);

  return (
    <div
      ref={(ref) => { if (ref) connect(drag(ref)); }}
      onClick={() => set_editable(true)}
      className="min-h-[1em] outline-none"
    >
      <p
        contentEditable={editable}
        suppressContentEditableWarning
        onBlur={(e) => {
          const new_text = e.currentTarget.textContent || '';
          set_text(new_text);
          setProp((props: TextBlockProps) => {
            props.text = new_text;
          });
        }}
        style={{
          fontSize: `${fontSize}px`,
          color,
          textAlign,
          fontWeight,
          margin: 0,
        }}
      >
        {text}
      </p>
    </div>
  );
}

TextBlock.craft = {
  props: {
    text: 'Text',
    fontSize: 16,
    color: '#000000',
    textAlign: 'left',
    fontWeight: 'normal',
  } as TextBlockProps,
  related: {},
};

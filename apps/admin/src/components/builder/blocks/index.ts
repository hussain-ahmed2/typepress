/**
 * Block Registry — Maps block types to their Craft.js resolver components.
 *
 * Used by the Editor to deserialize saved builder data.
 * Each block must be registered here to be usable in the builder.
 * Uses Lucide React icons for the toolbox display.
 */
import {
  Type,
  Heading1,
  Image,
  MousePointerClick,
  Container,
  Minus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TextBlock } from './text_block';
import { ImageBlock } from './image_block';
import { ButtonBlock } from './button_block';
import { ContainerBlock } from './container_block';
import { HeadingBlock } from './heading_block';
import { DividerBlock } from './divider_block';

/** Craft.js resolver — maps component names to React components */
export const block_resolver = {
  TextBlock,
  ImageBlock,
  ButtonBlock,
  ContainerBlock,
  HeadingBlock,
  DividerBlock,
};

/** Block metadata for the toolbox */
export const block_registry: Array<{
  type: string;
  name: string;
  icon: LucideIcon;
  description: string;
}> = [
  {
    type: 'TextBlock',
    name: 'Text',
    icon: Type,
    description: 'Editable text paragraph',
  },
  {
    type: 'HeadingBlock',
    name: 'Heading',
    icon: Heading1,
    description: 'Headline text (h1-h6)',
  },
  {
    type: 'ImageBlock',
    name: 'Image',
    icon: Image,
    description: 'Image with alt text',
  },
  {
    type: 'ButtonBlock',
    name: 'Button',
    icon: MousePointerClick,
    description: 'Clickable button with link',
  },
  {
    type: 'ContainerBlock',
    name: 'Container',
    icon: Container,
    description: 'Flex container for grouping blocks',
  },
  {
    type: 'DividerBlock',
    name: 'Divider',
    icon: Minus,
    description: 'Horizontal divider line',
  },
];

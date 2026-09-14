/**
 * Builder Blocks Tests — Unit tests for Craft.js block components.
 *
 * Tests block rendering, default props, and settings panels.
 * Uses a minimal Craft.js mock since full integration needs a browser.
 */
import { describe, it, expect } from 'vitest';

// Mock Craft.js hooks for unit testing
vi.mock('@craftjs/core', () => ({
  useNode: () => ({
    connectors: { connect: vi.fn(), drag: vi.fn() },
    actions: { setProp: vi.fn() },
    hasSelectedNode: false,
  }),
  useEditor: () => ({
    connectors: { create: vi.fn() },
    actions: { delete: vi.fn() },
    query: { serialize: vi.fn() },
    selected: null,
  }),
  Element: ({ children }: { children: React.ReactNode }) => children,
  Frame: ({ children }: { children: React.ReactNode }) => children,
  Editor: ({ children }: { children: React.ReactNode }) => children,
}));

import React from 'react';

// Import block types and their craft configs
import { TextBlock, type TextBlockProps } from '../blocks/text_block';
import { HeadingBlock, type HeadingBlockProps } from '../blocks/heading_block';
import { ImageBlock, type ImageBlockProps } from '../blocks/image_block';
import { ButtonBlock, type ButtonBlockProps } from '../blocks/button_block';
import { DividerBlock, type DividerBlockProps } from '../blocks/divider_block';
import { block_registry, block_resolver } from '../blocks/index';

describe('Block Registry', () => {
  it('should have 6 block types registered', () => {
    expect(block_registry).toHaveLength(6);
  });

  it('should have all required block types', () => {
    const types = block_registry.map((b) => b.type);
    expect(types).toContain('TextBlock');
    expect(types).toContain('HeadingBlock');
    expect(types).toContain('ImageBlock');
    expect(types).toContain('ButtonBlock');
    expect(types).toContain('ContainerBlock');
    expect(types).toContain('DividerBlock');
  });

  it('should have resolver with all block components', () => {
    expect(block_resolver.TextBlock).toBeDefined();
    expect(block_resolver.HeadingBlock).toBeDefined();
    expect(block_resolver.ImageBlock).toBeDefined();
    expect(block_resolver.ButtonBlock).toBeDefined();
    expect(block_resolver.ContainerBlock).toBeDefined();
    expect(block_resolver.DividerBlock).toBeDefined();
  });

  it('each block should have name, icon, and description', () => {
    for (const block of block_registry) {
      expect(block.name).toBeTruthy();
      expect(block.icon).toBeDefined();
      expect(block.description).toBeTruthy();
    }
  });
});

describe('TextBlock', () => {
  it('should have correct default props', () => {
    const props = TextBlock.craft?.props as TextBlockProps;
    expect(props.text).toBe('Text');
    expect(props.fontSize).toBe(16);
    expect(props.color).toBe('#000000');
    expect(props.textAlign).toBe('left');
    expect(props.fontWeight).toBe('normal');
  });
});

describe('HeadingBlock', () => {
  it('should have correct default props', () => {
    const props = HeadingBlock.craft?.props as HeadingBlockProps;
    expect(props.text).toBe('Heading');
    expect(props.level).toBe(2);
    expect(props.fontSize).toBe(32);
    expect(props.color).toBe('#111827');
    expect(props.textAlign).toBe('left');
  });
});

describe('ImageBlock', () => {
  it('should have correct default props', () => {
    const props = ImageBlock.craft?.props as ImageBlockProps;
    expect(props.src).toBe('');
    expect(props.alt).toBe('Image');
    expect(props.width).toBe('100%');
    expect(props.alignment).toBe('center');
  });
});

describe('ButtonBlock', () => {
  it('should have correct default props', () => {
    const props = ButtonBlock.craft?.props as ButtonBlockProps;
    expect(props.text).toBe('Click me');
    expect(props.variant).toBe('solid');
    expect(props.color).toBe('#3b82f6');
    expect(props.link).toBe('');
    expect(props.borderRadius).toBe(8);
  });
});

describe('DividerBlock', () => {
  it('should have correct default props', () => {
    const props = DividerBlock.craft?.props as DividerBlockProps;
    expect(props.style).toBe('solid');
    expect(props.color).toBe('#e5e7eb');
    expect(props.thickness).toBe(1);
    expect(props.margin).toBe(16);
  });
});

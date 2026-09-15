/**
 * Block Types — Defines all available blocks for the page builder.
 *
 * Each block has:
 *   - type: unique identifier
 *   - label: display name
 *   - icon: Lucide icon component
 *   - defaultProps: default values for new instances
 *   - settings: list of editable properties
 */
import type { LucideIcon } from 'lucide-react';
import { Type, Heading1, Image, MousePointerClick, Minus, Container } from 'lucide-react';

export interface BlockType {
  type: string;
  label: string;
  icon: LucideIcon;
  defaultProps: Record<string, unknown>;
  settings: PropertyDef[];
}

export interface PropertyDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'select' | 'boolean';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
}

export const block_types: BlockType[] = [
  {
    type: 'heading',
    label: 'Heading',
    icon: Heading1,
    defaultProps: { text: 'Heading', fontSize: 32, color: '#1E293B', textAlign: 'left' },
    settings: [
      { key: 'text', label: 'Text', type: 'text' },
      { key: 'fontSize', label: 'Font Size', type: 'number', min: 12, max: 96 },
      { key: 'color', label: 'Color', type: 'color' },
      { key: 'textAlign', label: 'Alignment', type: 'select', options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
      ]},
    ],
  },
  {
    type: 'text',
    label: 'Text',
    icon: Type,
    defaultProps: { text: 'Text content', fontSize: 16, color: '#64748B', textAlign: 'left' },
    settings: [
      { key: 'text', label: 'Text', type: 'text' },
      { key: 'fontSize', label: 'Font Size', type: 'number', min: 12, max: 72 },
      { key: 'color', label: 'Color', type: 'color' },
      { key: 'textAlign', label: 'Alignment', type: 'select', options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
      ]},
    ],
  },
  {
    type: 'image',
    label: 'Image',
    icon: Image,
    defaultProps: { src: '', alt: 'Image', width: '100%' },
    settings: [
      { key: 'src', label: 'Image URL', type: 'text' },
      { key: 'alt', label: 'Alt Text', type: 'text' },
      { key: 'width', label: 'Width', type: 'text' },
    ],
  },
  {
    type: 'button',
    label: 'Button',
    icon: MousePointerClick,
    defaultProps: { text: 'Button', color: '#2185d5', borderRadius: 6, link: '' },
    settings: [
      { key: 'text', label: 'Text', type: 'text' },
      { key: 'color', label: 'Color', type: 'color' },
      { key: 'borderRadius', label: 'Border Radius', type: 'number', min: 0, max: 50 },
      { key: 'link', label: 'Link URL', type: 'text' },
    ],
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: Minus,
    defaultProps: { style: 'solid', color: '#e5e7eb', thickness: 1, margin: 16 },
    settings: [
      { key: 'style', label: 'Style', type: 'select', options: [
        { value: 'solid', label: 'Solid' },
        { value: 'dashed', label: 'Dashed' },
        { value: 'dotted', label: 'Dotted' },
      ]},
      { key: 'color', label: 'Color', type: 'color' },
      { key: 'thickness', label: 'Thickness', type: 'number', min: 1, max: 10 },
      { key: 'margin', label: 'Margin', type: 'number', min: 0, max: 50 },
    ],
  },
  {
    type: 'container',
    label: 'Container',
    icon: Container,
    defaultProps: { background: '#f9fafb', padding: 16 },
    settings: [
      { key: 'background', label: 'Background', type: 'color' },
      { key: 'padding', label: 'Padding', type: 'number', min: 0, max: 100 },
    ],
  },
];

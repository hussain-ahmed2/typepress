/**
 * Builder Block Renderer — Safely renders persisted builder blocks on the public renderer.
 *
 * Security: renders text as React children (escaped), validates URLs, and restricts
 * style values to safe patterns to avoid dangerous HTML/CSS injection.
 */
import type { BuilderBlock, BuilderBlockPropValue, BuilderBlockType } from '@typepress/shared-types';

/** Allowed CSS color pattern: hex, rgb/rgba, hsl/hsla, or simple named colors. */
const SAFE_COLOR_PATTERN = /^(#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla)\([0-9.,%\s]+\)|[a-zA-Z]{1,32})$/;

/** Allowed border styles for divider blocks. */
const SAFE_BORDER_STYLES = new Set(['solid', 'dashed', 'dotted', 'double', 'none']);

/** Known block types that the renderer can safely display. */
const BUILDER_BLOCK_TYPES = new Set<BuilderBlockType>(['heading', 'text', 'image', 'button', 'divider', 'container']);

function is_builder_prop_value(value: unknown): value is BuilderBlockPropValue {
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

/**
 * Sanitizes unknown builder_data into safe typed blocks.
 * Used by the renderer because content meta comes from external/API data.
 */
export function sanitize_builder_blocks(value: unknown): BuilderBlock[] {
  if (!Array.isArray(value)) return [];

  const blocks: BuilderBlock[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== 'string' || record.id.length === 0) continue;
    if (typeof record.type !== 'string' || !BUILDER_BLOCK_TYPES.has(record.type as BuilderBlockType)) continue;

    const props_source = record.props && typeof record.props === 'object' && !Array.isArray(record.props)
      ? (record.props as Record<string, unknown>)
      : {};
    const props: Record<string, BuilderBlockPropValue> = {};
    for (const [key, prop_value] of Object.entries(props_source)) {
      if (is_builder_prop_value(prop_value)) {
        props[key] = prop_value;
      }
    }

    blocks.push({ id: record.id, type: record.type as BuilderBlockType, props });
    if (blocks.length >= 200) break;
  }

  return blocks;
}

function as_string(value: BuilderBlockPropValue | undefined, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function as_number(value: BuilderBlockPropValue | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Sanitizes CSS color values to prevent style injection. */
function sanitize_color(value: BuilderBlockPropValue | undefined, fallback: string): string {
  const color = as_string(value, fallback).trim();
  return SAFE_COLOR_PATTERN.test(color) ? color : fallback;
}

/** Allows only safe http(s) URLs or relative paths for links/images. */
function sanitize_url(value: BuilderBlockPropValue | undefined): string | null {
  const raw = as_string(value).trim();
  if (!raw) return null;
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

/** Clamps numeric values to a safe range. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Renders an array of builder blocks, ignoring unknown/invalid entries. */
export function BuilderBlocksRenderer({ blocks }: { blocks: readonly BuilderBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-4">
      {blocks.map((block) => (
        <BuilderBlockRenderer key={block.id} block={block} />
      ))}
    </div>
  );
}

/** Renders a single builder block with safe defaults. */
export function BuilderBlockRenderer({ block }: { block: BuilderBlock }) {
  const { type, props } = block;

  switch (type) {
    case 'heading': {
      const text_align = as_string(props.textAlign, 'left');
      const safe_align = text_align === 'center' || text_align === 'right' ? text_align : 'left';
      return (
        <h2
          className="font-bold"
          style={{
            fontSize: `${clamp(as_number(props.fontSize, 32), 12, 96)}px`,
            color: sanitize_color(props.color, '#1e293b'),
            textAlign: safe_align,
          }}
        >
          {as_string(props.text, 'Heading')}
        </h2>
      );
    }

    case 'text': {
      const text_align = as_string(props.textAlign, 'left');
      const safe_align = text_align === 'center' || text_align === 'right' ? text_align : 'left';
      return (
        <p
          className="leading-relaxed"
          style={{
            fontSize: `${clamp(as_number(props.fontSize, 16), 12, 72)}px`,
            color: sanitize_color(props.color, '#475569'),
            textAlign: safe_align,
          }}
        >
          {as_string(props.text, 'Text')}
        </p>
      );
    }

    case 'image': {
      const src = sanitize_url(props.src);
      const width = as_string(props.width, '100%').trim();
      const safe_width = /^\d{1,3}(?:%|px)$/.test(width) ? width : '100%';
      if (!src) {
        return (
          <div className="rounded-md border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            Image unavailable
          </div>
        );
      }
      return (
        <img
          src={src}
          alt={as_string(props.alt, '')}
          style={{ width: safe_width }}
          className="rounded-md"
          loading="lazy"
        />
      );
    }

    case 'button': {
      const href = sanitize_url(props.link);
      const label = as_string(props.text, 'Button');
      const background_color = sanitize_color(props.color, '#2563eb');
      const border_radius = clamp(as_number(props.borderRadius, 6), 0, 50);
      const class_name = 'inline-flex rounded-md px-6 py-2.5 font-medium text-white transition-opacity hover:opacity-90';
      if (href) {
        return (
          <a href={href} className={class_name} style={{ backgroundColor: background_color, borderRadius: border_radius }} rel="noreferrer noopener">
            {label}
          </a>
        );
      }
      return (
        <span className={class_name} style={{ backgroundColor: background_color, borderRadius: border_radius }}>
          {label}
        </span>
      );
    }

    case 'divider': {
      const style = as_string(props.style, 'solid');
      const border_style = SAFE_BORDER_STYLES.has(style) ? style : 'solid';
      const thickness = clamp(as_number(props.thickness, 1), 1, 10);
      const margin = clamp(as_number(props.margin, 16), 0, 50);
      return (
        <hr
          style={{
            border: 'none',
            borderTop: `${thickness}px ${border_style} ${sanitize_color(props.color, '#e2e8f0')}`,
            marginTop: `${margin}px`,
            marginBottom: `${margin}px`,
          }}
        />
      );
    }

    case 'container': {
      return (
        <div
          style={{
            background: sanitize_color(props.background, '#f8fafc'),
            padding: `${clamp(as_number(props.padding, 16), 0, 100)}px`,
            minHeight: '60px',
          }}
          className="rounded-md border border-dashed border-border"
        >
          {/* Containers currently have no nested children in the block schema. */}
        </div>
      );
    }

    default:
      return null; // Unknown block types are ignored for safety/forward compatibility.
  }
}
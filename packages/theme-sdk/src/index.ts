/**
 * Theme SDK — The public API for Typepress theme authors.
 *
 * Themes are React component packages that implement a defined "slot" contract.
 * Each slot represents a part of the page (header, footer, post list, etc.).
 *
 * Usage:
 *   import { define_theme, type SlotProps } from '@typepress/theme-sdk';
 *
 *   export default define_theme({
 *     name: 'my-theme',
 *     version: '1.0.0',
 *     slots: {
 *       header: MyHeader,
 *       footer: MyFooter,
 *       post_list: MyPostList,
 *       single_post: MySinglePost,
 *     },
 *   });
 */
import type { ContentDetail, ContentListItem, TaxonomyBrief } from '@typepress/shared-types';
import type { ComponentType } from 'react';

/**
 * Props passed to all slot components.
 * Provides content data, taxonomies, and site configuration.
 */
export interface SlotProps {
  /** Current content item (for single post/page views) */
  content?: ContentDetail;
  /** List of content items (for list views) */
  contents?: ContentListItem[];
  /** Taxonomies associated with the current content */
  taxonomies?: TaxonomyBrief[];
  /** Site-wide configuration */
  site_title: string;
  site_description: string;
}

/**
 * All slots a theme must implement.
 * Optional slots fall back to the default theme's implementation.
 */
export interface ThemeSlots {
  header: ComponentType<SlotProps>;
  footer: ComponentType<SlotProps>;
  post_list: ComponentType<SlotProps>;
  single_post: ComponentType<SlotProps>;
  sidebar?: ComponentType<SlotProps>;
}

/**
 * Full theme definition — what theme authors export.
 */
export interface ThemeDefinition {
  name: string;
  version: string;
  description?: string;
  slots: ThemeSlots;
  styles?: Record<string, string>;
}

/**
 * Theme manifest — the typepress.theme.json file format.
 * Used for theme discovery and validation.
 */
export interface ThemeManifest {
  name: string;
  version: string;
  description?: string;
  slots: string[];
  author?: string;
  screenshot?: string;
}

/**
 * Theme configuration — stored in the database for the active theme.
 */
export interface ThemeConfig {
  name: string;
  active: boolean;
  settings: Record<string, unknown>;
}

/**
 * Create a theme definition — ensures all required slots are present.
 */
export function define_theme(config: ThemeDefinition): ThemeDefinition {
  return {
    name: config.name,
    version: config.version,
    description: config.description,
    slots: config.slots,
    styles: config.styles,
  };
}

/**
 * Theme Registry — Manages available themes and the active theme.
 *
 * The renderer uses this to look up which slot components to render
 * for each page. If a theme doesn't implement an optional slot,
 * the registry falls back to the default theme's implementation.
 */
export class ThemeRegistry {
  private themes = new Map<string, ThemeDefinition>();
  private active_theme: string = 'default';

  /** Register a theme */
  register(theme: ThemeDefinition): void {
    this.themes.set(theme.name, theme);
  }

  /** Get a theme by name */
  get(name: string): ThemeDefinition | undefined {
    return this.themes.get(name);
  }

  /** Get all registered themes */
  get_all(): ThemeDefinition[] {
    return [...this.themes.values()];
  }

  /** Set the active theme */
  set_active(name: string): void {
    if (!this.themes.has(name)) {
      throw new Error(`Theme "${name}" is not registered`);
    }
    this.active_theme = name;
  }

  /** Get the active theme */
  get_active(): ThemeDefinition {
    const theme = this.themes.get(this.active_theme);
    if (!theme) {
      throw new Error(`Active theme "${this.active_theme}" not found`);
    }
    return theme;
  }

  /**
   * Get a slot component from the active theme.
   * Falls back to the default theme if the slot is optional and not implemented.
   */
  get_slot<K extends keyof ThemeSlots>(
    slot_name: K,
  ): ThemeSlots[K] | undefined {
    const active = this.get_active();
    if (active.slots[slot_name]) {
      return active.slots[slot_name];
    }

    // Fallback to default theme for optional slots
    if (slot_name !== 'header' && slot_name !== 'footer' &&
        slot_name !== 'post_list' && slot_name !== 'single_post') {
      const default_theme = this.themes.get('default');
      if (default_theme?.slots[slot_name]) {
        return default_theme.slots[slot_name];
      }
    }

    return undefined;
  }
}

/** Singleton theme registry shared across the renderer. */
export const theme_registry = new ThemeRegistry();

// Re-export shared types for convenience
export type { ContentDetail, ContentListItem, TaxonomyBrief } from '@typepress/shared-types';

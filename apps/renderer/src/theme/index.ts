/**
 * Theme runtime wiring for the renderer.
 *
 * Registers the default theme and exposes slot lookup helpers.
 * This keeps page components decoupled from concrete theme implementations.
 */
import type { ComponentType } from 'react';
import type { SlotProps, ThemeSlots } from '@typepress/theme-sdk';
import { theme_registry } from '@typepress/theme-sdk';

import { default_theme } from './default-theme';

/** Ensure the default theme is registered exactly once per module instance. */
function ensure_default_theme_registered(): void {
  if (!theme_registry.get(default_theme.name)) {
    theme_registry.register(default_theme);
  }
  theme_registry.set_active(default_theme.name);
}

ensure_default_theme_registered();

/** Return an active theme slot component with a typed fallback. */
export function get_theme_slot<K extends keyof ThemeSlots>(
  slot_name: K,
): ComponentType<SlotProps> {
  const slot = theme_registry.get_slot(slot_name);
  if (!slot) {
    throw new Error(`Theme slot "${String(slot_name)}" is not available`);
  }
  return slot as ComponentType<SlotProps>;
}

export { default_theme };

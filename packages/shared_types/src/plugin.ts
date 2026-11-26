/**
 * Plugin management types shared between API and admin.
 *
 * These types describe the persisted enabled/disabled state and the runtime
 * status reported by plugin management endpoints.
 */

/** Runtime status for a discovered plugin. */
export type PluginRuntimeStatus = 'loaded' | 'failed' | 'skipped' | 'disabled';

/** Admin/catalog metadata declared by a plugin manifest. */
export interface PluginAdminMetadata {
  display_name?: string;
  category?: string;
  settings_path?: string;
  icon?: string;
}

/** API-facing plugin record including persisted state and runtime status. */
export interface PluginStateRecord {
  name: string;
  version: string;
  /** Whether the plugin is enabled in persisted state. Missing DB rows default to true. */
  enabled: boolean;
  /** Current runtime status. Disabled plugins are discovered but not loaded. */
  status: PluginRuntimeStatus;
  description?: string;
  author?: string;
  source?: string;
  admin?: PluginAdminMetadata;
  error?: string;
}

/** Request payload for toggling plugin enabled state. */
export interface TogglePluginStateInput {
  enabled: boolean;
}

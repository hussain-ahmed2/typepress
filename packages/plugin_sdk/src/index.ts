/**
 * Plugin SDK — The public API for Typepress plugin authors.
 *
 * This is what external developers import when building a plugin.
 * It re-exports core functionality and adds plugin-specific helpers.
 *
 * Usage:
 *   import { define_plugin, hooks } from '@typepress/plugin-sdk';
 *
 *   export default define_plugin({
 *     name: 'my-plugin',
 *     version: '1.0.0',
 *     register(api) {
 *       api.hooks.on('content:after_create', async (content) => {
 *         console.log('New content:', content.title);
 *       });
 *     },
 *   });
 */
import type { Capability } from '@typepress/shared-types';
import { hooks } from '@typepress/core';
import type { HookHandler, FilterHandler } from '@typepress/core';

/**
 * Plugin definition helper — creates a properly typed plugin object.
 * Ensures all required fields are present and types are correct.
 */
export function define_plugin(config: {
  name: string;
  version: string;
  description?: string;
  required_capabilities?: Capability[];
  register: (api: PluginAPI) => void | Promise<void>;
}): PluginDefinition {
  return {
    name: config.name,
    version: config.version,
    description: config.description,
    required_capabilities: config.required_capabilities,
    register: config.register,
  };
}

/**
 * Plugin API — The interface passed to plugin.register().
 * Gives plugins access to the hook system and helper functions.
 */
export interface PluginAPI {
  /** Access the global hook registry for actions and filters */
  hooks: typeof hooks;

  /**
   * Register a named hook handler with a specific priority.
   * Lower priority runs first (default: 10).
   */
  on: (name: string, handler: HookHandler, priority?: number) => string;

  /**
   * Register a named filter handler.
   * Filters transform values through a pipeline.
   */
  register_filter: <T>(name: string, handler: FilterHandler<T>, priority?: number) => string;

  /**
   * Emit a hook event. All registered handlers will be called.
   */
  emit: (name: string, ...args: unknown[]) => Promise<void>;

  /**
   * Apply a filter pipeline to a value.
   */
  apply_filters: <T>(name: string, value: T, ...args: unknown[]) => T;
}

/**
 * Full plugin definition type — what plugin authors export.
 */
export interface PluginDefinition {
  name: string;
  version: string;
  description?: string;
  required_capabilities?: Capability[];
  register: (api: PluginAPI) => void | Promise<void>;
}

/**
 * Create a plugin API instance — called internally by the PluginManager
 * when loading a plugin. Not typically used by plugin authors.
 */
export function create_plugin_api(): PluginAPI {
  return {
    hooks,
    on: (name, handler, priority) => hooks.on(name, handler, priority),
    register_filter: (name, handler, priority) => hooks.register_filter(name, handler, priority),
    emit: (name, ...args) => hooks.emit(name, ...args),
    apply_filters: (name, value, ...args) => hooks.apply_filters(name, value, ...args),
  };
}

// Re-export core types for convenience
export { hooks } from '@typepress/core';
export { CapabilityChecker } from '@typepress/core';
export type { HookHandler, FilterHandler } from '@typepress/core';
export type { Capability } from '@typepress/shared-types';
export type { ApiResponse, PaginatedResponse } from '@typepress/shared-types';

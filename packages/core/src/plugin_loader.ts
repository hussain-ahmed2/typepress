/**
 * PluginManager — Manages the lifecycle of Typepress plugins.
 *
 * Plugins are trusted npm packages that register themselves at boot time.
 * Each plugin receives a PluginAPI with access to the hook system,
 * allowing it to extend system behavior without modifying core code.
 *
 * Phase 0-2: In-process loading (plugins run in the same Node.js process).
 * Phase 4+: Worker-thread isolation to prevent one bad plugin from crashing the site.
 *
 * Usage:
 *   const manager = new PluginManager();
 *   await manager.load(my_plugin);
 *   manager.has('my_plugin'); // true
 */
import type { Capability } from '@typepress/shared-types';
import { hooks } from './hooks';
import type { HookHandler, FilterHandler } from './hooks';

export interface Plugin {
  /** Unique plugin identifier (used in logs, registry lookups). */
  name: string;
  /** Semantic version string. */
  version: string;
  /** Capabilities this plugin requires to function. */
  required_capabilities?: Capability[];
  /** Called once at boot to register hooks, routes, etc. */
  register: (core: PluginAPI) => void | Promise<void>;
}

/** API surface exposed to plugins during registration. */
export interface PluginAPI {
  hooks: typeof hooks;
  on: (name: string, handler: HookHandler, priority?: number) => string;
  register_filter: <T>(name: string, handler: FilterHandler<T>, priority?: number) => string;
  emit: (name: string, ...args: unknown[]) => Promise<void>;
  apply_filters: <T>(name: string, value: T, ...args: unknown[]) => T;
}

/**
 * Create a PluginAPI instance that wraps the global hook registry.
 * Each plugin gets its own API instance (though they share the same hooks).
 */
function create_plugin_api(): PluginAPI {
  return {
    hooks,
    on: (name, handler, priority) => hooks.on(name, handler, priority),
    register_filter: (name, handler, priority) => hooks.register_filter(name, handler, priority),
    emit: (name, ...args) => hooks.emit(name, ...args),
    apply_filters: (name, value, ...args) => hooks.apply_filters(name, value, ...args),
  };
}

export class PluginManager {
  /** Map of loaded plugins keyed by name. */
  private loaded = new Map<string, Plugin>();

  /**
   * Load and register a plugin.
   * Creates a PluginAPI instance and passes it to plugin.register().
   * @throws Error if a plugin with the same name is already loaded.
   */
  async load(plugin: Plugin): Promise<void> {
    if (this.loaded.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already loaded`);
    }

    const api = create_plugin_api();
    await plugin.register(api);
    this.loaded.set(plugin.name, plugin);
  }

  /** Get a loaded plugin by name. */
  get(name: string): Plugin | undefined {
    return this.loaded.get(name);
  }

  /** Get all loaded plugins. */
  get_all(): Plugin[] {
    return [...this.loaded.values()];
  }

  /** Check if a plugin is loaded. */
  has(name: string): boolean {
    return this.loaded.has(name);
  }

  /** Unload a plugin by name. */
  unload(name: string): boolean {
    return this.loaded.delete(name);
  }
}

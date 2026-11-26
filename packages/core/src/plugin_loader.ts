/**
 * PluginManager — Manages the lifecycle of Typepress plugins.
 *
 * Plugins are trusted npm packages that register themselves at boot time.
 * Each plugin receives a PluginAPI with access to the hook system,
 * allowing it to extend system behavior without modifying core code.
 *
 * The manager supports strict programmatic loading (`load`) and safe runtime
 * loading (`load_safely`) used by filesystem discovery where one bad plugin
 * must not crash the server.
 */
import type { FastifyInstance } from 'fastify';
import type { Capability } from '@typepress/shared-types';
import { hooks } from './hooks';
import type { FilterHandler, HookHandler } from './hooks';
import type { PluginAdminMetadata, PluginManifest } from './plugin_manifest';

/** Contract every Typepress plugin must satisfy. */
export interface Plugin {
  /** Unique plugin identifier (used in logs, registry lookups). */
  name: string;
  /** Semantic version string. */
  version: string;
  /** Human-readable description for logs/admin surfaces. */
  description?: string;
  /** Capabilities this plugin requires to function. */
  required_capabilities?: Capability[];
  /** Optional admin/catalog metadata from manifest or plugin definition. */
  admin?: PluginAdminMetadata;
  /** Optional manifest source metadata for runtime introspection. */
  manifest?: PluginManifest;
  /** Called once at boot to register hooks, filters, and runtime integrations. */
  register: (core: PluginAPI) => void | Promise<void>;
  /**
   * Optional route registration hook. Runs after successful plugin registration
   * when a Fastify instance is available to the runtime.
   */
  register_routes?: (app: FastifyInstance) => void | Promise<void>;
}

/** API surface exposed to plugins during registration. */
export interface PluginAPI {
  hooks: typeof hooks;
  on: (name: string, handler: HookHandler, priority?: number) => string;
  register_filter: <T>(name: string, handler: FilterHandler<T>, priority?: number) => string;
  emit: (name: string, ...args: unknown[]) => Promise<void>;
  apply_filters: <T>(name: string, value: T, ...args: unknown[]) => T;
}

/** Runtime status for a discovered/loaded plugin. */
export type PluginRuntimeStatus = 'loaded' | 'failed' | 'skipped' | 'disabled';

/** Runtime record used by admin/health surfaces and diagnostics. */
export interface PluginLoadRecord {
  name: string;
  version: string;
  status: PluginRuntimeStatus;
  /** Persisted enabled state; defaults to true for backward compatibility. */
  enabled: boolean;
  description?: string;
  author?: string;
  source?: string;
  admin?: PluginAdminMetadata;
  manifest?: PluginManifest;
  error?: string;
}

/** Result of a safe plugin load attempt. */
export interface PluginLoadResult {
  ok: boolean;
  record: PluginLoadRecord;
}

/** Options for loading a plugin through the runtime. */
export interface PluginLoadOptions {
  /** Manifest metadata associated with the plugin package. */
  manifest?: PluginManifest;
  /** Filesystem/source identifier for diagnostics. */
  source?: string;
  /** Fastify app used for optional route registration. */
  app?: FastifyInstance;
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

function to_error_message(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function build_loaded_record(
  plugin: Plugin,
  options: PluginLoadOptions | undefined,
  status: PluginRuntimeStatus,
  error?: string,
  enabled: boolean = true,
): PluginLoadRecord {
  const manifest = options?.manifest ?? plugin.manifest;
  const description = plugin.description ?? manifest?.description;
  const author = manifest?.author;
  const admin = plugin.admin ?? manifest?.admin;

  const record: PluginLoadRecord = {
    name: plugin.name,
    version: plugin.version,
    status,
    enabled,
  };
  if (description !== undefined) record.description = description;
  if (author !== undefined) record.author = author;
  if (options?.source !== undefined) record.source = options.source;
  if (admin !== undefined) record.admin = admin;
  if (manifest !== undefined) record.manifest = manifest;
  if (error !== undefined) record.error = error;
  return record;
}

export class PluginManager {
  /** Map of loaded plugins keyed by name. */
  private loaded = new Map<string, Plugin>();

  /** Runtime records keyed by plugin name (loaded, failed, skipped). */
  private records = new Map<string, PluginLoadRecord>();

  /**
   * Load and register a plugin.
   * Creates a PluginAPI instance and passes it to plugin.register().
   * @throws Error if a plugin with the same name is already loaded.
   */
  async load(plugin: Plugin, options?: PluginLoadOptions): Promise<void> {
    if (this.loaded.has(plugin.name)) {
      const error = new Error(`Plugin "${plugin.name}" is already loaded`);
      this.records.set(plugin.name, build_loaded_record(plugin, options, 'failed', error.message));
      throw error;
    }

    const api = create_plugin_api();
    await plugin.register(api);

    if (options?.app && plugin.register_routes) {
      await plugin.register_routes(options.app);
    }

    const merged_description = plugin.description ?? options?.manifest?.description;
    const merged_admin = plugin.admin ?? options?.manifest?.admin;
    const merged_manifest = plugin.manifest ?? options?.manifest;
    const should_enrich =
      merged_description !== plugin.description ||
      merged_admin !== plugin.admin ||
      merged_manifest !== plugin.manifest;

    const registered_plugin: Plugin = should_enrich
      ? {
          ...plugin,
          ...(merged_description !== undefined ? { description: merged_description } : {}),
          ...(merged_admin !== undefined ? { admin: merged_admin } : {}),
          ...(merged_manifest !== undefined ? { manifest: merged_manifest } : {}),
        }
      : plugin;

    this.loaded.set(plugin.name, registered_plugin);
    this.records.set(plugin.name, build_loaded_record(registered_plugin, options, 'loaded'));
  }

  /**
   * Safely load a plugin without throwing. Failures are captured in records so
   * the server can continue loading other plugins.
   */
  async load_safely(plugin: Plugin, options?: PluginLoadOptions): Promise<PluginLoadResult> {
    try {
      await this.load(plugin, options);
      const record = this.records.get(plugin.name);
      if (!record) {
        // Defensive fallback; load() always sets a record on success.
        const fallback = build_loaded_record(plugin, options, 'loaded');
        this.records.set(plugin.name, fallback);
        return { ok: true, record: fallback };
      }
      return { ok: record.status === 'loaded', record };
    } catch (error) {
      const message = to_error_message(error);
      const record = build_loaded_record(plugin, options, 'failed', message);
      this.records.set(plugin.name, record);
      return { ok: false, record };
    }
  }

  /** Record a failed plugin discovery/load attempt. */
  record_failure(name: string, version: string, error: string, options?: PluginLoadOptions): PluginLoadRecord {
    const manifest = options?.manifest;
    const record: PluginLoadRecord = {
      name,
      version,
      status: 'failed',
      enabled: true,
      error,
    };
    if (manifest?.description !== undefined) record.description = manifest.description;
    if (manifest?.author !== undefined) record.author = manifest.author;
    if (manifest?.admin !== undefined) record.admin = manifest.admin;
    if (manifest !== undefined) record.manifest = manifest;
    if (options?.source !== undefined) record.source = options.source;
    this.records.set(name, record);
    return record;
  }

  /** Record a discovered plugin that is intentionally disabled and was not loaded. */
  record_disabled(name: string, version: string, options?: PluginLoadOptions): PluginLoadRecord {
    const manifest = options?.manifest;
    const record: PluginLoadRecord = {
      name,
      version,
      status: 'disabled',
      enabled: false,
    };
    if (manifest?.description !== undefined) record.description = manifest.description;
    if (manifest?.author !== undefined) record.author = manifest.author;
    if (manifest?.admin !== undefined) record.admin = manifest.admin;
    if (manifest !== undefined) record.manifest = manifest;
    if (options?.source !== undefined) record.source = options.source;
    this.records.set(name, record);
    return record;
  }

  /** Get a loaded plugin by name. */
  get(name: string): Plugin | undefined {
    return this.loaded.get(name);
  }

  /** Get all loaded plugins. */
  get_all(): Plugin[] {
    return [...this.loaded.values()];
  }

  /** Get runtime records for all load attempts. */
  get_records(): PluginLoadRecord[] {
    return [...this.records.values()];
  }

  /** Check if a plugin is loaded. */
  has(name: string): boolean {
    return this.loaded.has(name);
  }

  /** Unload a plugin by name. */
  unload(name: string): boolean {
    this.records.delete(name);
    return this.loaded.delete(name);
  }
}

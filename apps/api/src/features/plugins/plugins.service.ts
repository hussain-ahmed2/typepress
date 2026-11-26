/**
 * Plugins Service — Lists discovered plugins and persists enabled/disabled state.
 *
 * State is stored in the PluginState table. Missing rows default to enabled for
 * backward compatibility. Runtime status is merged from the active PluginManager
 * when available.
 */
import { db, plugin_states } from '@typepress/db';
import type { ApiResponse, PluginStateRecord } from '@typepress/shared-types';
import { discover_plugin_manifests, get_runtime_plugin_manager } from '../../plugins';
import { config } from '../../config';

/** Merge discovered manifests, persisted state, and runtime records into API records. */
export class PluginsService {
  /** List all discovered plugins with persisted enabled state and runtime status. */
  async list_plugins(): Promise<ApiResponse<PluginStateRecord[]>> {
    const [discovered, persisted_states] = await Promise.all([
      discover_plugin_manifests(config.PLUGINS_DIR),
      this.get_persisted_states(),
    ]);

    const runtime_manager = get_runtime_plugin_manager();
    const runtime_records = runtime_manager?.get_records() ?? [];
    const runtime_by_name = new Map(runtime_records.map((record) => [record.name, record]));

    const records_by_name = new Map<string, PluginStateRecord>();

    // Start with discovered manifests so we show all installable/discoverable plugins.
    for (const { manifest, source } of discovered) {
      const enabled = persisted_states.get(manifest.name) ?? true;
      const runtime = runtime_by_name.get(manifest.name);

      records_by_name.set(manifest.name, {
        name: manifest.name,
        version: runtime?.version ?? manifest.version,
        enabled,
        status: runtime?.status ?? (enabled ? 'skipped' : 'disabled'),
        ...(manifest.description ? { description: manifest.description } : {}),
        ...(manifest.author ? { author: manifest.author } : {}),
        ...(source ? { source } : {}),
        ...(manifest.admin ? { admin: manifest.admin } : {}),
        ...(runtime?.error ? { error: runtime.error } : {}),
      });
    }

    // Include runtime records for plugins not discovered from manifests (e.g. load failures before manifest parse).
    for (const runtime of runtime_records) {
      if (records_by_name.has(runtime.name)) continue;
      const enabled = persisted_states.get(runtime.name) ?? runtime.enabled;
      records_by_name.set(runtime.name, {
        name: runtime.name,
        version: runtime.version,
        enabled,
        status: runtime.status,
        ...(runtime.description ? { description: runtime.description } : {}),
        ...(runtime.author ? { author: runtime.author } : {}),
        ...(runtime.source ? { source: runtime.source } : {}),
        ...(runtime.admin ? { admin: runtime.admin } : {}),
        ...(runtime.error ? { error: runtime.error } : {}),
      });
    }

    const records = [...records_by_name.values()].sort((a, b) => a.name.localeCompare(b.name));
    return { success: true, data: records };
  }

  /** Toggle persisted enabled state for a plugin by name. */
  async toggle_plugin(name: string, enabled: boolean): Promise<ApiResponse<PluginStateRecord>> {
    const normalized_name = name.trim();
    if (normalized_name.length === 0) {
      return { success: false, error: { code: 'INVALID_PLUGIN_NAME', message: 'Plugin name is required' } };
    }

    await db
      .insert(plugin_states)
      .values({ name: normalized_name, enabled })
      .onConflictDoUpdate({
        target: plugin_states.name,
        set: { enabled },
      });

    // Return the merged record so the admin can update UI immediately.
    const list_result = await this.list_plugins();
    const record = list_result.data?.find((item) => item.name === normalized_name);

    if (record) {
      return { success: true, data: record };
    }

    // Plugin not discovered in filesystem/runtime; still persist and return a minimal record.
    return {
      success: true,
      data: {
        name: normalized_name,
        version: '0.0.0',
        enabled,
        status: enabled ? 'skipped' : 'disabled',
      },
    };
  }

  /** Read all persisted plugin states into a name->enabled map. */
  private async get_persisted_states(): Promise<Map<string, boolean>> {
    try {
      const states = await db
        .select({ name: plugin_states.name, enabled: plugin_states.enabled })
        .from(plugin_states);
      return new Map(states.map((state) => [state.name, state.enabled]));
    } catch {
      // Backward compatibility: missing table or DB read failure should not break listing.
      return new Map();
    }
  }
}

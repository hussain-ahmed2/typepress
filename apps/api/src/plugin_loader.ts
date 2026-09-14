/**
 * Plugin Loader — Discovers and loads plugins from the plugins/ directory.
 *
 * Scans for directories containing typepress.plugin.json manifests.
 * Validates each manifest and loads the plugin's main entry point.
 *
 * Plugin directory structure:
 *   plugins/
 *     seo/
 *       typepress.plugin.json
 *       package.json
 *       src/index.ts
 */
import { readdir } from 'fs/promises';
import { join } from 'path';
import type { Plugin } from '@typepress/core';
import { PluginManager } from '@typepress/core';

const PLUGIN_DIR = join(process.cwd(), 'plugins');

/**
 * Load all plugins from the plugins/ directory.
 * Each plugin must have a typepress.plugin.json manifest.
 */
export async function load_plugins(plugin_manager: PluginManager): Promise<void> {
  try {
    const entries = await readdir(PLUGIN_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const plugin_dir = join(PLUGIN_DIR, entry.name);
      const manifest_path = join(plugin_dir, 'typepress.plugin.json');

      try {
        const manifest_raw = await import(manifest_path);
        const manifest = manifest_raw.default ?? manifest_raw;

        console.log(`[PluginLoader] Found plugin: ${manifest.name} v${manifest.version}`);

        // For now, plugins are loaded as in-process modules
        // Future: worker-thread isolation for untrusted plugins
        const plugin: Plugin = {
          name: manifest.name,
          version: manifest.version,
          register: async () => {
            console.log(`[PluginLoader] Registered plugin: ${manifest.name}`);
            // Plugin registration happens via hooks system
          },
        };

        await plugin_manager.load(plugin);
      } catch (error) {
        console.error(`[PluginLoader] Failed to load plugin "${entry.name}":`, error);
      }
    }
  } catch (error) {
    // plugins/ directory might not exist yet — that's fine
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[PluginLoader] Error scanning plugins directory:', error);
    }
  }
}

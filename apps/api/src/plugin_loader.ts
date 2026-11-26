/**
 * Plugin Loader — Backward-compatible wrapper around the real plugin runtime.
 *
 * The implementation lives in `./plugins/plugin_runtime.ts`. This file keeps the
 * existing import path (`./plugin_loader`) stable for server/bootstrap code.
 */
import type { FastifyInstance } from 'fastify';
import type { PluginManager } from '@typepress/core';
import { load_plugins as load_plugins_runtime } from './plugins';

/**
 * Load all plugins from the configured plugins directory.
 * Each plugin must contain a `typepress.plugin.json` manifest.
 */
export async function load_plugins(plugin_manager: PluginManager, app?: FastifyInstance): Promise<void> {
  await load_plugins_runtime(plugin_manager, app);
}

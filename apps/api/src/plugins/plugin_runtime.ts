/**
 * Plugin runtime discovery and loading.
 *
 * Discovers plugin packages from a configured directory, validates manifests and
 * plugin contracts, imports plugin modules, and registers them through
 * PluginManager with failure isolation.
 */
import { readdir, readFile } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FastifyInstance } from 'fastify';
import {
  parse_plugin_manifest,
  type Plugin,
  type PluginLoadRecord,
  type PluginLoadResult,
  type PluginManager,
  type PluginManifest,
} from '@typepress/core';
import { db, plugin_states } from '@typepress/db';
import { config } from '../config';
import { create_logger } from '../infrastructure/logger';

const log = create_logger('PluginRuntime');

/** Default plugins directory: <repo>/plugins when API runs from apps/api. */
const DEFAULT_PLUGINS_DIR = path.resolve(process.cwd(), '..', '..', 'plugins');

/** Supported plugin manifest filename. */
const MANIFEST_FILENAME = 'typepress.plugin.json';

/** Last plugin manager used by the runtime, for admin/diagnostic endpoints. */
let runtime_plugin_manager: PluginManager | undefined;

/** Return the active plugin manager, if plugins have been loaded. */
export function get_runtime_plugin_manager(): PluginManager | undefined {
  return runtime_plugin_manager;
}

/** Options for filesystem plugin discovery/loading. */
export interface LoadPluginsOptions {
  /** Directory to scan for plugin packages. Defaults to config.PLUGINS_DIR or repo plugins/. */
  plugins_dir?: string;
  /** Fastify app for plugins that register routes. */
  app?: FastifyInstance;
}

/** Summary returned by the runtime loader. */
export interface PluginRuntimeLoadSummary {
  plugins_dir: string;
  records: PluginLoadRecord[];
  loaded: number;
  failed: number;
  disabled: number;
}

interface PluginPackageJson {
  name?: unknown;
  version?: unknown;
  main?: unknown;
  module?: unknown;
  exports?: unknown;
  typepress?: unknown;
}

interface PluginModuleShape {
  default?: unknown;
  plugin?: unknown;
}

function is_record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function to_error_message(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function resolve_plugins_dir(plugins_dir?: string): string {
  const configured = plugins_dir ?? config.PLUGINS_DIR;
  if (!configured) return DEFAULT_PLUGINS_DIR;
  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
}

async function read_json_file(file_path: string): Promise<unknown> {
  const content = await readFile(file_path, 'utf8');
  return JSON.parse(content) as unknown;
}

async function read_package_json(plugin_dir: string): Promise<PluginPackageJson | null> {
  const package_path = path.join(plugin_dir, 'package.json');
  try {
    const parsed = await read_json_file(package_path);
    if (!is_record(parsed)) return null;
    return parsed as PluginPackageJson;
  } catch {
    return null;
  }
}

function get_export_entry(exports_field: unknown): string | null {
  if (typeof exports_field === 'string') return exports_field;
  if (!is_record(exports_field)) return null;

  const dot_export = exports_field['.'];
  if (typeof dot_export === 'string') return dot_export;
  if (is_record(dot_export)) {
    for (const key of ['import', 'default', 'node', 'require']) {
      const value = dot_export[key];
      if (typeof value === 'string') return value;
    }
  }

  for (const key of ['import', 'default', 'node', 'require']) {
    const value = exports_field[key];
    if (typeof value === 'string') return value;
  }

  return null;
}

function resolve_entry_candidates(plugin_dir: string, package_json: PluginPackageJson | null): string[] {
  const candidates: string[] = [];

  if (package_json) {
    const export_entry = get_export_entry(package_json.exports);
    if (export_entry) candidates.push(export_entry);
    if (typeof package_json.module === 'string') candidates.push(package_json.module);
    if (typeof package_json.main === 'string') candidates.push(package_json.main);
  }

  // Common runtime/build layouts for local workspace plugins.
  candidates.push('dist/index.js', 'dist/index.mjs', 'src/index.ts', 'src/index.js', 'index.js', 'index.mjs');

  const seen = new Set<string>();
  const resolved: string[] = [];
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (trimmed.length === 0) continue;
    const absolute = path.resolve(plugin_dir, trimmed);
    if (seen.has(absolute)) continue;
    seen.add(absolute);
    resolved.push(absolute);
  }
  return resolved;
}

async function import_plugin_module(entry_path: string): Promise<unknown> {
  const href = pathToFileURL(entry_path).href;
  return import(href);
}

function is_plugin_contract(value: unknown): value is Plugin {
  if (!is_record(value)) return false;
  const name = value.name;
  const version = value.version;
  const register = value.register;
  return typeof name === 'string' && name.trim().length > 0
    && typeof version === 'string' && version.trim().length > 0
    && typeof register === 'function';
}

function extract_plugin_export(module_value: unknown): Plugin | null {
  if (is_plugin_contract(module_value)) return module_value;
  if (!is_record(module_value)) return null;

  const module_shape = module_value as PluginModuleShape;
  if (is_plugin_contract(module_shape.default)) return module_shape.default;
  if (is_plugin_contract(module_shape.plugin)) return module_shape.plugin;

  return null;
}

function validate_plugin_against_manifest(plugin: Plugin, manifest: PluginManifest): string[] {
  const errors: string[] = [];
  if (plugin.name.trim() !== manifest.name) {
    errors.push(`plugin name "${plugin.name}" does not match manifest name "${manifest.name}"`);
  }
  if (plugin.version.trim() !== manifest.version) {
    errors.push(`plugin version "${plugin.version}" does not match manifest version "${manifest.version}"`);
  }
  return errors;
}

function enrich_plugin(plugin: Plugin, manifest: PluginManifest): Plugin {
  return {
    ...plugin,
    description: plugin.description ?? manifest.description,
    admin: plugin.admin ?? manifest.admin,
    manifest,
  };
}

/**
 * Load persisted plugin enabled/disabled states.
 * Missing rows mean enabled (backward compatibility). If the DB read fails,
 * default to enabled to avoid breaking plugin loading.
 */
async function get_plugin_enabled_states(): Promise<Map<string, boolean>> {
  try {
    const states = await db
      .select({ name: plugin_states.name, enabled: plugin_states.enabled })
      .from(plugin_states);
    return new Map(states.map((state) => [state.name, state.enabled]));
  } catch (error) {
    log.warn(` Failed to read plugin states, defaulting to enabled: ${to_error_message(error)}`);
    return new Map();
  }
}

async function load_plugin_from_directory(
  plugin_manager: PluginManager,
  plugin_dir: string,
  enabled_states: Map<string, boolean>,
  app?: FastifyInstance,
): Promise<PluginLoadResult> {
  const manifest_path = path.join(plugin_dir, MANIFEST_FILENAME);

  let manifest_raw: unknown;
  try {
    manifest_raw = await read_json_file(manifest_path);
  } catch (error) {
    const message = `Failed to read ${MANIFEST_FILENAME}: ${to_error_message(error)}`;
    log.error(` ${message} (${plugin_dir})`);
    const record = plugin_manager.record_failure(path.basename(plugin_dir), '0.0.0', message, { source: plugin_dir });
    return { ok: false, record };
  }

  const manifest_result = parse_plugin_manifest(manifest_raw);
  if (!manifest_result.valid || !manifest_result.manifest) {
    const message = `Invalid manifest: ${manifest_result.errors.join('; ')}`;
    log.error(` ${message} (${plugin_dir})`);
    const record = plugin_manager.record_failure(path.basename(plugin_dir), '0.0.0', message, { source: plugin_dir });
    return { ok: false, record };
  }

  const manifest = manifest_result.manifest;

  // Respect persisted plugin state; missing rows default to enabled.
  const is_enabled = enabled_states.get(manifest.name) ?? true;
  if (!is_enabled) {
    log.info(` Skipping disabled plugin: ${manifest.name} v${manifest.version}`);
    const record = plugin_manager.record_disabled(manifest.name, manifest.version, { manifest, source: plugin_dir });
    return { ok: true, record };
  }
  const package_json = await read_package_json(plugin_dir);
  const entry_candidates = resolve_entry_candidates(plugin_dir, package_json);

  let imported_module: unknown;
  let loaded_entry: string | null = null;
  let last_import_error: unknown;

  for (const entry_path of entry_candidates) {
    try {
      imported_module = await import_plugin_module(entry_path);
      loaded_entry = entry_path;
      break;
    } catch (error) {
      last_import_error = error;
    }
  }

  if (!loaded_entry) {
    const message = `Unable to import plugin entry. Tried: ${entry_candidates.map((c) => path.relative(plugin_dir, c)).join(', ')}. Last error: ${to_error_message(last_import_error)}`;
    log.error(` ${manifest.name}: ${message}`);
    const record = plugin_manager.record_failure(manifest.name, manifest.version, message, { manifest, source: plugin_dir });
    return { ok: false, record };
  }

  const plugin = extract_plugin_export(imported_module);
  if (!plugin) {
    const message = `Plugin module does not export a valid plugin contract (expected default export with name, version, register) from ${path.relative(plugin_dir, loaded_entry)}`;
    log.error(` ${manifest.name}: ${message}`);
    const record = plugin_manager.record_failure(manifest.name, manifest.version, message, { manifest, source: plugin_dir });
    return { ok: false, record };
  }

  const contract_errors = validate_plugin_against_manifest(plugin, manifest);
  if (contract_errors.length > 0) {
    const message = `Plugin contract mismatch: ${contract_errors.join('; ')}`;
    log.error(` ${manifest.name}: ${message}`);
    const record = plugin_manager.record_failure(manifest.name, manifest.version, message, { manifest, source: plugin_dir });
    return { ok: false, record };
  }

  const enriched = enrich_plugin(plugin, manifest);
  log.info(` Loading plugin: ${manifest.name} v${manifest.version}`);
  const result = await plugin_manager.load_safely(enriched, { manifest, source: plugin_dir, app });

  if (result.ok) {
    log.info(` Loaded plugin: ${manifest.name} v${manifest.version}`);
  } else {
    log.error(` Failed plugin: ${manifest.name} v${manifest.version} - ${result.record.error ?? 'unknown error'}`);
  }

  return result;
}

/** Discovered plugin manifest with its source directory. */
export interface DiscoveredPluginManifest {
  manifest: PluginManifest;
  source: string;
}

/**
 * Discover valid plugin manifests from the plugins directory.
 * Invalid/unreadable manifests are skipped; runtime load records capture load failures.
 */
export async function discover_plugin_manifests(plugins_dir?: string): Promise<DiscoveredPluginManifest[]> {
  const resolved_dir = resolve_plugins_dir(plugins_dir);
  let entries: Dirent<string>[];
  try {
    entries = await readdir(resolved_dir, { withFileTypes: true, encoding: 'utf8' });
  } catch {
    return [];
  }

  const discovered: DiscoveredPluginManifest[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const plugin_dir = path.join(resolved_dir, entry.name);
    const manifest_path = path.join(plugin_dir, MANIFEST_FILENAME);
    try {
      const raw = await read_json_file(manifest_path);
      const parsed = parse_plugin_manifest(raw);
      if (parsed.valid && parsed.manifest) {
        discovered.push({ manifest: parsed.manifest, source: plugin_dir });
      }
    } catch {
      // Ignore invalid/unreadable manifests in discovery; load/runtime surfaces report failures.
    }
  }

  return discovered;
}

/**
 * Discover and load all plugins from the configured plugins directory.
 * Each plugin directory must contain a `typepress.plugin.json` manifest.
 */
export async function load_plugins_from_directory(
  plugin_manager: PluginManager,
  options: LoadPluginsOptions = {},
): Promise<PluginRuntimeLoadSummary> {
  runtime_plugin_manager = plugin_manager;
  const plugins_dir = resolve_plugins_dir(options.plugins_dir);
  const records: PluginLoadRecord[] = [];

  let entries: Dirent<string>[];
  try {
    entries = await readdir(plugins_dir, { withFileTypes: true, encoding: 'utf8' });
  } catch (error) {
    if (is_record(error) && error.code === 'ENOENT') {
      log.info(` Plugins directory not found, skipping: ${plugins_dir}`);
      return { plugins_dir, records, loaded: 0, failed: 0, disabled: 0 };
    }
    log.error(` Failed to scan plugins directory ${plugins_dir}: ${to_error_message(error)}`);
    return { plugins_dir, records, loaded: 0, failed: 0, disabled: 0 };
  }

  const enabled_states = await get_plugin_enabled_states();

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;

    const plugin_dir = path.join(plugins_dir, entry.name);
    const manifest_path = path.join(plugin_dir, MANIFEST_FILENAME);

    // Skip directories that are not plugin packages.
    try {
      await readFile(manifest_path, 'utf8');
    } catch {
      continue;
    }

    try {
      const result = await load_plugin_from_directory(plugin_manager, plugin_dir, enabled_states, options.app);
      records.push(result.record);
    } catch (error) {
      // Defensive isolation: load_plugin_from_directory should not throw, but keep runtime safe.
      const message = to_error_message(error);
      log.error(` Unexpected plugin runtime error for "${entry.name}": ${message}`);
      records.push(plugin_manager.record_failure(entry.name, '0.0.0', message, { source: plugin_dir }));
    }
  }

  const loaded = records.filter((record) => record.status === 'loaded').length;
  const failed = records.filter((record) => record.status === 'failed').length;
  const disabled = records.filter((record) => record.status === 'disabled').length;
  log.info(` Plugin runtime complete: ${loaded} loaded, ${failed} failed, ${disabled} disabled (${plugins_dir})`);

  return { plugins_dir, records, loaded, failed, disabled };
}

/** Backward-compatible API loader signature used by server bootstrap. */
export async function load_plugins(plugin_manager: PluginManager, app?: FastifyInstance): Promise<void> {
  await load_plugins_from_directory(plugin_manager, { app });
}

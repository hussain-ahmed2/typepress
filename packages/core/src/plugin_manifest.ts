/**
 * Plugin manifest types and validation.
 *
 * A manifest is the `typepress.plugin.json` file shipped with each plugin.
 * Validation is intentionally strict and dependency-free so the core runtime
 * can reject malformed manifests before importing plugin code.
 */

/** Raw manifest shape read from typepress.plugin.json. */
export interface PluginManifest {
  /** Unique plugin identifier. Used for registration and lookups. */
  name: string;
  /** Semantic version string. */
  version: string;
  /** Human-readable description shown in admin/catalog surfaces. */
  description?: string;
  /** Plugin author name or identifier. */
  author?: string;
  /** Optional plugin dependencies by plugin name. */
  dependencies?: string[];
  /** Admin UI slots this plugin contributes to. */
  slots?: string[];
  /** Optional admin-facing metadata for catalog/settings surfaces. */
  admin?: PluginAdminMetadata;
}

/** Admin metadata declared by a plugin manifest. */
export interface PluginAdminMetadata {
  /** Display name for admin surfaces; falls back to manifest name. */
  display_name?: string;
  /** Short category label for marketplace/catalog grouping. */
  category?: string;
  /** Settings route/path in admin UI, if plugin provides settings. */
  settings_path?: string;
  /** Icon name from the admin icon set. */
  icon?: string;
}

/** Result returned by manifest validation/parsing. */
export interface PluginManifestParseResult {
  valid: boolean;
  manifest?: PluginManifest;
  errors: string[];
}

function is_record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function is_non_empty_string(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function read_optional_string(
  source: Record<string, unknown>,
  key: string,
  errors: string[],
): string | undefined {
  const value = source[key];
  if (value === undefined) return undefined;
  if (!is_non_empty_string(value)) {
    errors.push(`"${key}" must be a non-empty string when provided`);
    return undefined;
  }
  return value.trim();
}

function read_optional_string_array(
  source: Record<string, unknown>,
  key: string,
  errors: string[],
): string[] | undefined {
  const value = source[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every(is_non_empty_string)) {
    errors.push(`"${key}" must be an array of non-empty strings when provided`);
    return undefined;
  }
  return value.map((item) => item.trim());
}

function read_optional_admin_metadata(
  source: Record<string, unknown>,
  errors: string[],
): PluginAdminMetadata | undefined {
  const value = source.admin;
  if (value === undefined) return undefined;
  if (!is_record(value)) {
    errors.push('"admin" must be an object when provided');
    return undefined;
  }

  const admin: PluginAdminMetadata = {};
  const display_name = read_optional_string(value, 'display_name', errors);
  const category = read_optional_string(value, 'category', errors);
  const settings_path = read_optional_string(value, 'settings_path', errors);
  const icon = read_optional_string(value, 'icon', errors);

  if (display_name !== undefined) admin.display_name = display_name;
  if (category !== undefined) admin.category = category;
  if (settings_path !== undefined) admin.settings_path = settings_path;
  if (icon !== undefined) admin.icon = icon;

  return Object.keys(admin).length > 0 ? admin : undefined;
}

/**
 * Validate and normalize an unknown manifest value.
 * Unknown fields are ignored so manifests can carry forward-compatible metadata.
 */
export function parse_plugin_manifest(input: unknown): PluginManifestParseResult {
  const errors: string[] = [];
  if (!is_record(input)) {
    return { valid: false, errors: ['manifest must be a JSON object'] };
  }

  const name = input.name;
  const version = input.version;

  if (!is_non_empty_string(name)) {
    errors.push('"name" is required and must be a non-empty string');
  }
  if (!is_non_empty_string(version)) {
    errors.push('"version" is required and must be a non-empty string');
  }

  const description = read_optional_string(input, 'description', errors);
  const author = read_optional_string(input, 'author', errors);
  const dependencies = read_optional_string_array(input, 'dependencies', errors);
  const slots = read_optional_string_array(input, 'slots', errors);
  const admin = read_optional_admin_metadata(input, errors);

  if (errors.length > 0 || !is_non_empty_string(name) || !is_non_empty_string(version)) {
    return { valid: false, errors };
  }

  const manifest: PluginManifest = {
    name: name.trim(),
    version: version.trim(),
  };
  if (description !== undefined) manifest.description = description;
  if (author !== undefined) manifest.author = author;
  if (dependencies !== undefined) manifest.dependencies = dependencies;
  if (slots !== undefined) manifest.slots = slots;
  if (admin !== undefined) manifest.admin = admin;

  return { valid: true, manifest, errors: [] };
}

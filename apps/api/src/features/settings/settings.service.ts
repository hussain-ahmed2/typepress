/**
 * Settings Service — Persists and retrieves site settings.
 *
 * Settings are stored in the Setting table as a JSON object under the "site" key.
 * Reads merge stored values over DEFAULT_SITE_SETTINGS so new fields get defaults.
 */
import { eq } from 'drizzle-orm';
import { db, settings } from '@typepress/db';
import type { ApiResponse, SiteSettings, UpdateSiteSettingsInput } from '@typepress/shared-types';

/** Default site settings used when no persisted value exists. */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site_title: 'Typepress',
  site_description: 'A TypeScript-native CMS',
  site_url: 'http://localhost:4001',
  admin_email: 'admin@typepress.dev',
  rate_limiting_enabled: true,
};

const SITE_SETTINGS_KEY = 'site';

/** Narrow unknown JSON to a plain object record. */
function is_record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Coerce persisted JSON into a typed SiteSettings object with defaults. */
export function normalize_site_settings(value: unknown): SiteSettings {
  const record = is_record(value) ? value : {};

  return {
    site_title: typeof record.site_title === 'string' ? record.site_title : DEFAULT_SITE_SETTINGS.site_title,
    site_description: typeof record.site_description === 'string' ? record.site_description : DEFAULT_SITE_SETTINGS.site_description,
    site_url: typeof record.site_url === 'string' ? record.site_url : DEFAULT_SITE_SETTINGS.site_url,
    admin_email: typeof record.admin_email === 'string' ? record.admin_email : DEFAULT_SITE_SETTINGS.admin_email,
    rate_limiting_enabled: typeof record.rate_limiting_enabled === 'boolean'
      ? record.rate_limiting_enabled
      : DEFAULT_SITE_SETTINGS.rate_limiting_enabled,
  };
}

export class SettingsService {
  /** Return site settings, falling back to defaults when unset. */
  async get_site_settings(): Promise<ApiResponse<SiteSettings>> {
    const [setting] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, SITE_SETTINGS_KEY))
      .limit(1);

    const data = normalize_site_settings(setting?.value);
    return { success: true, data };
  }

  /** Merge partial updates into persisted site settings and return the new value. */
  async update_site_settings(input: UpdateSiteSettingsInput): Promise<ApiResponse<SiteSettings>> {
    const current = await this.get_site_settings();
    if (!current.success || !current.data) {
      return { success: false, error: { code: 'SETTINGS_READ_FAILED', message: 'Failed to read current settings' } };
    }

    const merged: SiteSettings = {
      ...current.data,
      ...input,
    };

    // Persist as plain JSON-compatible data for the jsonb column.
    const value: unknown = JSON.parse(JSON.stringify(merged));

    const [saved] = await db
      .insert(settings)
      .values({ key: SITE_SETTINGS_KEY, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value },
      })
      .returning({ value: settings.value });

    return { success: true, data: normalize_site_settings(saved?.value ?? value) };
  }
}

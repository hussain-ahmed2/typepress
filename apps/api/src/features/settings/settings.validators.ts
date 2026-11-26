/**
 * Settings Validators — Zod schemas for settings API payloads.
 *
 * update_site_settings_schema accepts a partial SiteSettings payload.
 * Empty-string checks prevent accidentally persisting blank core fields.
 */
import { z } from 'zod';

export const update_site_settings_schema = z.object({
  site_title: z.string().min(1).max(200).optional(),
  site_description: z.string().max(500).optional(),
  site_url: z.string().url().optional(),
  admin_email: z.string().email().optional(),
  rate_limiting_enabled: z.boolean().optional(),
}).strict();

export type UpdateSiteSettingsSchema = z.infer<typeof update_site_settings_schema>;

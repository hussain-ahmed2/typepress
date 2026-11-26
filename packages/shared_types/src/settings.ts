/**
 * Settings Types — Shared contracts for site settings persistence and API payloads.
 *
 * SiteSettings is the primary settings namespace stored under the "site" key.
 * Keep this interface extensible by adding optional fields for new namespaces/features.
 */

export interface SiteSettings {
  site_title: string;
  site_description: string;
  site_url: string;
  admin_email: string;
  /** Enables login/rate-limit protections surfaced in admin settings. */
  rate_limiting_enabled: boolean;
}

/** Partial payload for updating site settings; omitted fields keep their stored values. */
export type UpdateSiteSettingsInput = Partial<SiteSettings>;

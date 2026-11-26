/**
 * Plugin Feature Validators — Zod schemas for plugin management endpoints.
 */
import { z } from 'zod';

/** Route params for plugin name-targeted operations. */
export const plugin_name_params_schema = z.object({
  name: z.string().trim().min(1),
});

/** Body schema for enabling/disabling a plugin. */
export const toggle_plugin_state_schema = z.object({
  enabled: z.boolean(),
});

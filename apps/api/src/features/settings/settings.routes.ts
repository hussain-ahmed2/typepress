/**
 * Settings Routes — Admin-protected endpoints for site settings.
 *
 * GET  /api/settings — Read current site settings (merged with defaults).
 * PUT  /api/settings — Update site settings; partial payloads are merged.
 */
import type { FastifyInstance } from 'fastify';
import { require_auth, require_capability, validate_body } from '../../infrastructure/middleware';
import { SettingsService } from './settings.service';
import { update_site_settings_schema } from './settings.validators';
import type { UpdateSiteSettingsInput } from '@typepress/shared-types';

const settings_service = new SettingsService();

export async function settings_routes(app: FastifyInstance) {
  /** GET / — Return current site settings. */
  app.get('/', {
    preHandler: [require_auth, require_capability('settings:manage')],
  }, async (_request, reply) => {
    const result = await settings_service.get_site_settings();
    return reply.send(result);
  });

  /** PUT / — Update site settings (partial merge). */
  app.put('/', {
    preHandler: [require_auth, require_capability('settings:manage'), validate_body(update_site_settings_schema)],
  }, async (request, reply) => {
    const result = await settings_service.update_site_settings(request.body as UpdateSiteSettingsInput);
    if (!result.success) {
      return reply.status(400).send(result);
    }
    return reply.send(result);
  });
}

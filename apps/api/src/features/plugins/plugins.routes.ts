/**
 * Plugins Routes — Admin-protected endpoints for plugin state management.
 *
 * GET   /api/plugins      — List discovered plugins with persisted/runtime state.
 * PATCH /api/plugins/:name — Enable or disable a plugin (persisted in DB).
 */
import type { FastifyInstance } from 'fastify';
import type { TogglePluginStateInput } from '@typepress/shared-types';
import { require_auth, require_capability, validate_body, validate_params } from '../../infrastructure/middleware';
import { PluginsService } from './plugins.service';
import { plugin_name_params_schema, toggle_plugin_state_schema } from './plugins.validators';

const plugins_service = new PluginsService();

/** Register plugin management routes. */
export async function plugins_routes(app: FastifyInstance): Promise<void> {
  /** GET / — List discovered plugins with persisted enabled state and runtime status. */
  app.get('/', {
    preHandler: [require_auth, require_capability('settings:manage')],
  }, async (_request, reply) => {
    const result = await plugins_service.list_plugins();
    if (!result.success) {
      return reply.status(500).send(result);
    }
    return reply.send(result);
  });

  /** PATCH /:name — Persist enabled/disabled state for a plugin. */
  app.patch('/:name', {
    preHandler: [
      require_auth,
      require_capability('settings:manage'),
      validate_params(plugin_name_params_schema),
      validate_body(toggle_plugin_state_schema),
    ],
  }, async (request, reply) => {
    const { name } = request.params as { name: string };
    const { enabled } = request.body as TogglePluginStateInput;
    const result = await plugins_service.toggle_plugin(name, enabled);
    if (!result.success) {
      return reply.status(400).send(result);
    }
    return reply.send(result);
  });
}

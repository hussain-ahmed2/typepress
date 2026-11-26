/**
 * Plugins Service Tests — verifies persisted state merge and toggle behavior.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  find_many_plugin_states_mock,
  upsert_plugin_state_mock,
  insert_values_mock,
  on_conflict_do_update_mock,
  discover_plugin_manifests_mock,
  get_runtime_plugin_manager_mock,
} = vi.hoisted(() => ({
  find_many_plugin_states_mock: vi.fn(),
  upsert_plugin_state_mock: vi.fn(),
  insert_values_mock: vi.fn(),
  on_conflict_do_update_mock: vi.fn(),
  discover_plugin_manifests_mock: vi.fn(),
  get_runtime_plugin_manager_mock: vi.fn(),
}));

// Drizzle-style db mock for plugin state persistence.
vi.mock('@typepress/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => find_many_plugin_states_mock()),
    })),
    insert: vi.fn(() => ({
      values: (values: unknown) => {
        insert_values_mock(values);
        return {
          onConflictDoUpdate: (config: unknown) => {
            on_conflict_do_update_mock(config);
            return upsert_plugin_state_mock();
          },
        };
      },
    })),
  },
  plugin_states: { name: 'plugin_states.name', enabled: 'plugin_states.enabled' },
}));

vi.mock('../../plugins', () => ({
  discover_plugin_manifests: discover_plugin_manifests_mock,
  get_runtime_plugin_manager: get_runtime_plugin_manager_mock,
}));

vi.mock('../../config', () => ({
  config: {
    PLUGINS_DIR: undefined,
  },
}));

import { PluginsService } from './plugins.service';

describe('PluginsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    discover_plugin_manifests_mock.mockResolvedValue([
      {
        manifest: { name: 'seo', version: '1.0.0', description: 'SEO plugin', author: 'Typepress' },
        source: '/plugins/seo',
      },
    ]);
    get_runtime_plugin_manager_mock.mockReturnValue({
      get_records: () => [
        {
          name: 'seo',
          version: '1.0.0',
          status: 'loaded',
          enabled: true,
          description: 'SEO plugin',
          author: 'Typepress',
          source: '/plugins/seo',
        },
      ],
    });
  });

  it('lists discovered plugins with persisted enabled state', async () => {
    find_many_plugin_states_mock.mockResolvedValue([{ name: 'seo', enabled: false }]);

    const service = new PluginsService();
    const result = await service.list_plugins();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]).toMatchObject({
      name: 'seo',
      enabled: false,
      status: 'loaded',
    });
  });

  it('defaults missing plugin state rows to enabled', async () => {
    find_many_plugin_states_mock.mockResolvedValue([]);

    const service = new PluginsService();
    const result = await service.list_plugins();

    expect(result.success).toBe(true);
    expect(result.data?.[0]).toMatchObject({ name: 'seo', enabled: true });
  });

  it('upserts plugin state when toggling', async () => {
    find_many_plugin_states_mock.mockResolvedValue([{ name: 'seo', enabled: false }]);
    upsert_plugin_state_mock.mockResolvedValue(undefined);

    const service = new PluginsService();
    const result = await service.toggle_plugin('seo', false);

    expect(insert_values_mock).toHaveBeenCalledWith({ name: 'seo', enabled: false });
    expect(on_conflict_do_update_mock).toHaveBeenCalledWith({
      target: 'plugin_states.name',
      set: { enabled: false },
    });
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('seo');
  });
});

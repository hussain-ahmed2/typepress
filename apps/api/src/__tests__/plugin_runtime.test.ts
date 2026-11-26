import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PluginManager } from '@typepress/core';

const { find_many_plugin_states_mock } = vi.hoisted(() => ({
  find_many_plugin_states_mock: vi.fn().mockResolvedValue([]),
}));

vi.mock('../config', () => ({
  config: {
    PLUGINS_DIR: undefined,
  },
}));

vi.mock('../infrastructure/logger', () => ({
  create_logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Drizzle-style db mock: select().from(plugin_states) resolves to persisted state rows.
vi.mock('@typepress/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => find_many_plugin_states_mock()),
    })),
  },
  plugin_states: { name: 'name', enabled: 'enabled' },
}));

import { load_plugins_from_directory } from '../plugins/plugin_runtime';

const temp_dirs: string[] = [];

async function make_temp_dir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'typepress-plugins-'));
  temp_dirs.push(dir);
  return dir;
}

afterEach(async () => {
  find_many_plugin_states_mock.mockReset();
  find_many_plugin_states_mock.mockResolvedValue([]);
  await Promise.all(temp_dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('plugin runtime discovery', () => {
  it('loads valid plugins and isolates bad plugins', async () => {
    const plugins_dir = await make_temp_dir();

    const good_dir = path.join(plugins_dir, 'good-plugin');
    await mkdir(good_dir, { recursive: true });
    await writeFile(
      path.join(good_dir, 'typepress.plugin.json'),
      JSON.stringify({ name: 'good-plugin', version: '1.0.0', description: 'Good plugin' }),
      'utf8',
    );
    await writeFile(
      path.join(good_dir, 'index.mjs'),
      `export default { name: 'good-plugin', version: '1.0.0', register(api) { api.hooks.on('test:event', () => {}); } };`,
      'utf8',
    );
    await writeFile(
      path.join(good_dir, 'package.json'),
      JSON.stringify({ name: '@test/good-plugin', version: '1.0.0', main: './index.mjs' }),
      'utf8',
    );

    const bad_dir = path.join(plugins_dir, 'bad-plugin');
    await mkdir(bad_dir, { recursive: true });
    await writeFile(
      path.join(bad_dir, 'typepress.plugin.json'),
      JSON.stringify({ name: 'bad-plugin', version: '1.0.0' }),
      'utf8',
    );
    await writeFile(path.join(bad_dir, 'index.mjs'), 'export default { nope: true };', 'utf8');
    await writeFile(
      path.join(bad_dir, 'package.json'),
      JSON.stringify({ name: '@test/bad-plugin', version: '1.0.0', main: './index.mjs' }),
      'utf8',
    );

    const manager = new PluginManager();
    const summary = await load_plugins_from_directory(manager, { plugins_dir });

    expect(summary.loaded).toBe(1);
    expect(summary.failed).toBe(1);
    expect(manager.has('good-plugin')).toBe(true);
    expect(manager.has('bad-plugin')).toBe(false);

    const bad_record = manager.get_records().find((record) => record.name === 'bad-plugin');
    expect(bad_record?.status).toBe('failed');
    expect(bad_record?.error).toContain('valid plugin contract');
  });

  it('skips missing plugins directory without throwing', async () => {
    const manager = new PluginManager();
    const summary = await load_plugins_from_directory(manager, {
      plugins_dir: path.join(os.tmpdir(), 'typepress-missing-plugins-dir'),
    });

    expect(summary.loaded).toBe(0);
    expect(summary.failed).toBe(0);
    expect(summary.records).toHaveLength(0);
  });

  it('does not load plugins disabled in persisted state', async () => {
    const plugins_dir = await make_temp_dir();
    const plugin_dir = path.join(plugins_dir, 'disabled-plugin');
    await mkdir(plugin_dir, { recursive: true });
    await writeFile(
      path.join(plugin_dir, 'typepress.plugin.json'),
      JSON.stringify({ name: 'disabled-plugin', version: '1.0.0', description: 'Disabled plugin' }),
      'utf8',
    );
    await writeFile(
      path.join(plugin_dir, 'index.mjs'),
      'export default { name: "disabled-plugin", version: "1.0.0", register() { throw new Error("should not run"); } };',
      'utf8',
    );
    await writeFile(
      path.join(plugin_dir, 'package.json'),
      JSON.stringify({ name: '@test/disabled-plugin', version: '1.0.0', main: './index.mjs' }),
      'utf8',
    );

    find_many_plugin_states_mock.mockResolvedValue([{ name: 'disabled-plugin', enabled: false }]);

    const manager = new PluginManager();
    const summary = await load_plugins_from_directory(manager, { plugins_dir });

    expect(summary.loaded).toBe(0);
    expect(summary.failed).toBe(0);
    expect(summary.disabled).toBe(1);
    expect(manager.has('disabled-plugin')).toBe(false);

    const record = manager.get_records().find((r) => r.name === 'disabled-plugin');
    expect(record?.status).toBe('disabled');
    expect(record?.enabled).toBe(false);
  });
});

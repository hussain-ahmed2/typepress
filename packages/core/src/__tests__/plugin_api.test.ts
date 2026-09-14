/**
 * Plugin Loader Tests — Tests for plugin discovery and loading.
 *
 * Verifies that the PluginManager correctly loads plugins,
 * handles duplicates, and exposes loaded plugins.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PluginManager } from '../plugin_loader';
import type { Plugin } from '../plugin_loader';

function create_test_plugin(name: string): Plugin {
  return {
    name,
    version: '1.0.0',
    register: vi.fn(),
  };
}

describe('PluginManager', () => {
  let manager: PluginManager;

  beforeEach(() => {
    manager = new PluginManager();
  });

  it('should load a plugin', async () => {
    const plugin = create_test_plugin('test-plugin');
    await manager.load(plugin);

    expect(manager.has('test-plugin')).toBe(true);
    expect(plugin.register).toHaveBeenCalledOnce();
  });

  it('should throw on duplicate plugin', async () => {
    const plugin = create_test_plugin('test-plugin');
    await manager.load(plugin);

    await expect(manager.load(plugin)).rejects.toThrow(
      'Plugin "test-plugin" is already loaded',
    );
  });

  it('should get plugin by name', async () => {
    const plugin = create_test_plugin('test-plugin');
    await manager.load(plugin);

    expect(manager.get('test-plugin')).toBe(plugin);
    expect(manager.get('nonexistent')).toBeUndefined();
  });

  it('should get all loaded plugins', async () => {
    const plugin_a = create_test_plugin('plugin-a');
    const plugin_b = create_test_plugin('plugin-b');

    await manager.load(plugin_a);
    await manager.load(plugin_b);

    const all = manager.get_all();
    expect(all).toHaveLength(2);
    expect(all).toContain(plugin_a);
    expect(all).toContain(plugin_b);
  });

  it('should unload a plugin', async () => {
    const plugin = create_test_plugin('test-plugin');
    await manager.load(plugin);

    const result = manager.unload('test-plugin');
    expect(result).toBe(true);
    expect(manager.has('test-plugin')).toBe(false);
  });

  it('should return false when unloading nonexistent plugin', () => {
    const result = manager.unload('nonexistent');
    expect(result).toBe(false);
  });

  it('should call register with PluginAPI', async () => {
    const register_fn = vi.fn();
    const plugin: Plugin = {
      name: 'test-plugin',
      version: '1.0.0',
      register: register_fn,
    };

    await manager.load(plugin);

    const api_arg = register_fn.mock.calls[0]![0];
    expect(api_arg).toHaveProperty('hooks');
    expect(api_arg).toHaveProperty('on');
    expect(api_arg).toHaveProperty('emit');
    expect(api_arg).toHaveProperty('register_filter');
    expect(api_arg).toHaveProperty('apply_filters');
  });
});

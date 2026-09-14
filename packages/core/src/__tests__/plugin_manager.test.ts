import { describe, it, expect, vi } from 'vitest';
import { PluginManager } from '../plugin_loader';
import type { Plugin } from '../plugin_loader';

function create_mock_plugin(name: string): Plugin {
  return {
    name,
    version: '1.0.0',
    register: vi.fn(),
  };
}

describe('PluginManager', () => {
  it('should load a plugin', async () => {
    const manager = new PluginManager();
    const plugin = create_mock_plugin('test-plugin');

    await manager.load(plugin);

    expect(manager.has('test-plugin')).toBe(true);
    expect(plugin.register).toHaveBeenCalledOnce();
  });

  it('should throw on duplicate plugin', async () => {
    const manager = new PluginManager();
    const plugin = create_mock_plugin('test-plugin');

    await manager.load(plugin);

    await expect(manager.load(plugin)).rejects.toThrow('Plugin "test-plugin" is already loaded');
  });

  it('should get plugin by name', async () => {
    const manager = new PluginManager();
    const plugin = create_mock_plugin('test-plugin');

    await manager.load(plugin);

    expect(manager.get('test-plugin')).toBe(plugin);
    expect(manager.get('nonexistent')).toBeUndefined();
  });

  it('should get all loaded plugins', async () => {
    const manager = new PluginManager();
    const plugin_a = create_mock_plugin('plugin-a');
    const plugin_b = create_mock_plugin('plugin-b');

    await manager.load(plugin_a);
    await manager.load(plugin_b);

    const all = manager.get_all();
    expect(all).toHaveLength(2);
    expect(all).toContain(plugin_a);
    expect(all).toContain(plugin_b);
  });

  it('should unload a plugin', async () => {
    const manager = new PluginManager();
    const plugin = create_mock_plugin('test-plugin');

    await manager.load(plugin);
    const result = manager.unload('test-plugin');

    expect(result).toBe(true);
    expect(manager.has('test-plugin')).toBe(false);
  });

  it('should return false when unloading nonexistent plugin', () => {
    const manager = new PluginManager();

    const result = manager.unload('nonexistent');
    expect(result).toBe(false);
  });

  it('should call register with plugin api', async () => {
    const manager = new PluginManager();
    const register_fn = vi.fn();
    const plugin: Plugin = {
      name: 'test-plugin',
      version: '1.0.0',
      register: register_fn,
    };

    await manager.load(plugin);

    const api_arg = register_fn.mock.calls[0]![0];
    expect(api_arg).toHaveProperty('hooks');
  });
});

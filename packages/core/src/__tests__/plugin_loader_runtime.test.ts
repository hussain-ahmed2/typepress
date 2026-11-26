import { describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { PluginManager } from '../plugin_loader';
import type { Plugin } from '../plugin_loader';

describe('PluginManager runtime behavior', () => {
  it('load_safely captures registration failures without throwing', async () => {
    const manager = new PluginManager();
    const plugin: Plugin = {
      name: 'broken-plugin',
      version: '1.0.0',
      register: () => {
        throw new Error('boom');
      },
    };

    const result = await manager.load_safely(plugin, { source: '/tmp/plugins/broken-plugin' });

    expect(result.ok).toBe(false);
    expect(result.record.status).toBe('failed');
    expect(result.record.error).toContain('boom');
    expect(result.record.source).toBe('/tmp/plugins/broken-plugin');
    expect(manager.has('broken-plugin')).toBe(false);
    expect(manager.get_records()).toHaveLength(1);
  });

  it('load_safely stores manifest metadata and marks plugin loaded', async () => {
    const manager = new PluginManager();
    const register = vi.fn();
    const plugin: Plugin = { name: 'seo', version: '1.0.0', register };

    const result = await manager.load_safely(plugin, {
      source: '/tmp/plugins/seo',
      manifest: {
        name: 'seo',
        version: '1.0.0',
        description: 'SEO plugin',
        author: 'Typepress',
        admin: { category: 'Marketing' },
      },
    });

    expect(result.ok).toBe(true);
    expect(result.record.status).toBe('loaded');
    expect(result.record.description).toBe('SEO plugin');
    expect(result.record.author).toBe('Typepress');
    expect(manager.get('seo')?.manifest?.name).toBe('seo');
  });

  it('calls optional register_routes when app context is provided', async () => {
    const manager = new PluginManager();
    const register_routes = vi.fn();
    const app = { log: { info: vi.fn() } } as unknown as FastifyInstance;
    const plugin: Plugin = {
      name: 'routes-plugin',
      version: '1.0.0',
      register: vi.fn(),
      register_routes,
    };

    const result = await manager.load_safely(plugin, { app });

    expect(result.ok).toBe(true);
    expect(register_routes).toHaveBeenCalledWith(app);
  });

  it('record_failure stores diagnostic record', () => {
    const manager = new PluginManager();

    const record = manager.record_failure('bad', '0.0.0', 'Invalid manifest', {
      source: '/tmp/plugins/bad',
      manifest: { name: 'bad', version: '0.0.0', description: 'Bad plugin' },
    });

    expect(record.status).toBe('failed');
    expect(record.error).toBe('Invalid manifest');
    expect(manager.get_records()[0]?.name).toBe('bad');
  });
});

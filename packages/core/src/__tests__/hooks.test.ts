import { describe, it, expect, vi } from 'vitest';
import { HookRegistry } from '../hooks';

describe('HookRegistry', () => {
  it('should register and execute sync hooks', async () => {
    const registry = new HookRegistry();
    const handler = vi.fn();

    registry.on('test', handler);
    await registry.emit('test', 'arg1', 'arg2');

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should execute hooks in priority order', async () => {
    const registry = new HookRegistry();
    const order: number[] = [];

    registry.on('test', () => order.push(1), 20);
    registry.on('test', () => order.push(2), 10);
    registry.on('test', () => order.push(3), 30);

    await registry.emit('test');

    expect(order).toEqual([2, 1, 3]);
  });

  it('should return hook id for removal', () => {
    const registry = new HookRegistry();
    const handler = vi.fn();

    const id = registry.on('test', handler);
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^hook_/);
  });

  it('should remove hook by id', async () => {
    const registry = new HookRegistry();
    const handler = vi.fn();

    const id = registry.on('test', handler);
    registry.remove(id);
    await registry.emit('test');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should clear all hooks for a name', async () => {
    const registry = new HookRegistry();
    const handler = vi.fn();

    registry.on('test', handler);
    registry.clear('test');
    await registry.emit('test');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should clear all hooks when no name given', async () => {
    const registry = new HookRegistry();
    const handler_a = vi.fn();
    const handler_b = vi.fn();

    registry.on('test_a', handler_a);
    registry.on('test_b', handler_b);
    registry.clear();
    await registry.emit('test_a');
    await registry.emit('test_b');

    expect(handler_a).not.toHaveBeenCalled();
    expect(handler_b).not.toHaveBeenCalled();
  });

  it('should handle async hooks', async () => {
    const registry = new HookRegistry();
    const order: string[] = [];

    registry.on('test', async () => {
      await new Promise((r) => setTimeout(r, 10));
      order.push('first');
    });
    registry.on('test', async () => {
      order.push('second');
    });

    await registry.emit('test');

    expect(order).toEqual(['first', 'second']);
  });

  it('should register and apply filters', () => {
    const registry = new HookRegistry();

    registry.register_filter<number>('double', (val) => val * 2);
    registry.register_filter<number>('add_ten', (val) => val + 10);

    const result = registry.apply_filters('double', 5);
    expect(result).toBe(10);

    const result2 = registry.apply_filters('add_ten', 5);
    expect(result2).toBe(15);
  });

  it('should apply filters in priority order', () => {
    const registry = new HookRegistry();

    registry.register_filter<number>('test', (val) => val + 1, 20);
    registry.register_filter<number>('test', (val) => val * 2, 10);

    const result = registry.apply_filters('test', 3);
    expect(result).toBe(7); // (3 * 2) + 1
  });

  it('should remove filter by id', () => {
    const registry = new HookRegistry();

    const id = registry.register_filter<number>('test', (val) => val * 2);
    registry.remove(id);

    const result = registry.apply_filters('test', 5);
    expect(result).toBe(5);
  });
});

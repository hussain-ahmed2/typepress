/**
 * HookRegistry — The backbone of Typepress's extensibility system.
 *
 * Provides two extension mechanisms:
 *   1. Actions (on/emit) — fire-and-forget side effects (e.g., "after_content_create")
 *   2. Filters (register_filter/apply_filters) — transform values through a pipeline
 *
 * Every hook/filter is prioritized (lower = runs first, default 10).
 * Handlers execute in priority order, supporting both sync and async.
 *
 * Usage:
 *   const hooks = new HookRegistry();
 *   hooks.on('content:after_create', async (content) => { ... });
 *   hooks.emit('content:after_create', new_content);
 */
export type HookHandler<T extends unknown[] = unknown[]> = (...args: T) => void | Promise<void>;
export type FilterHandler<T = unknown> = (value: T, ...args: unknown[]) => T | Promise<T>;

interface HookEntry {
  id: string;
  priority: number;
  handler: HookHandler;
}

interface FilterEntry {
  id: string;
  priority: number;
  handler: FilterHandler;
}

export class HookRegistry {
  /** Registered action handlers, keyed by hook name. */
  private hooks = new Map<string, HookEntry[]>();

  /** Registered filter handlers, keyed by filter name. */
  private filters = new Map<string, FilterEntry[]>();

  /** Auto-incrementing ID counter for unique hook/filter identification. */
  private next_id = 0;

  /**
   * Register an action handler for a named hook.
   * Returns an ID that can be used to remove the handler later.
   *
   * @param name - Hook name (e.g., "content:before_create")
   * @param handler - Function to call when hook fires
   * @param priority - Execution order (lower = runs first, default 10)
   * @returns Unique handler ID for removal
   */
  on(name: string, handler: HookHandler, priority = 10): string {
    const id = `hook_${this.next_id++}`;
    const entry = { id, priority, handler };
    const list = this.hooks.get(name) ?? [];
    list.push(entry);
    list.sort((a, b) => a.priority - b.priority);
    this.hooks.set(name, list);
    return id;
  }

  /**
   * Fire all handlers registered for a named hook.
   * Executes async handlers sequentially to preserve ordering guarantees.
   *
   * @param name - Hook name to fire
   * @param args - Arguments passed to each handler
   */
  async emit(name: string, ...args: unknown[]): Promise<void> {
    const entries = this.hooks.get(name) ?? [];
    for (const entry of entries) {
      await entry.handler(...args);
    }
  }

  /**
   * Apply a filter pipeline to a value.
   * Each filter transforms the value and passes it to the next.
   * Filters run synchronously — use async handlers carefully.
   *
   * @param name - Filter name (e.g., "content:render_title")
   * @param value - Initial value to transform
   * @param args - Additional args passed to each filter handler
   * @returns Transformed value after all filters run
   */
  apply_filters<T>(name: string, value: T, ...args: unknown[]): T {
    const entries = this.filters.get(name) ?? [];
    let result = value;
    for (const entry of entries) {
      result = entry.handler(result, ...args) as T;
    }
    return result;
  }

  /**
   * Register a filter handler for a named filter.
   * Returns an ID for removal.
   */
  register_filter<T>(name: string, handler: FilterHandler<T>, priority = 10): string {
    const id = `filter_${this.next_id++}`;
    const entry = { id, priority, handler: handler as FilterHandler };
    const list = this.filters.get(name) ?? [];
    list.push(entry);
    list.sort((a, b) => a.priority - b.priority);
    this.filters.set(name, list);
    return id;
  }

  /**
   * Remove a hook or filter by its ID.
   * @returns true if found and removed, false otherwise
   */
  remove(id: string): boolean {
    for (const [name, list] of this.hooks) {
      const idx = list.findIndex((e) => e.id === id);
      if (idx !== -1) {
        list.splice(idx, 1);
        if (list.length === 0) this.hooks.delete(name);
        return true;
      }
    }
    for (const [name, list] of this.filters) {
      const idx = list.findIndex((e) => e.id === id);
      if (idx !== -1) {
        list.splice(idx, 1);
        if (list.length === 0) this.filters.delete(name);
        return true;
      }
    }
    return false;
  }

  /**
   * Clear all hooks/filters. If name is provided, only clears that specific one.
   */
  clear(name?: string): void {
    if (name) {
      this.hooks.delete(name);
      this.filters.delete(name);
    } else {
      this.hooks.clear();
      this.filters.clear();
    }
  }
}

/** Singleton hook registry shared across the entire application. */
export const hooks = new HookRegistry();

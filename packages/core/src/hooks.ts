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
  private hooks = new Map<string, HookEntry[]>();
  private filters = new Map<string, FilterEntry[]>();
  private next_id = 0;

  on(name: string, handler: HookHandler, priority = 10): string {
    const id = `hook_${this.next_id++}`;
    const entry = { id, priority, handler };
    const list = this.hooks.get(name) ?? [];
    list.push(entry);
    list.sort((a, b) => a.priority - b.priority);
    this.hooks.set(name, list);
    return id;
  }

  async emit(name: string, ...args: unknown[]): Promise<void> {
    const entries = this.hooks.get(name) ?? [];
    for (const entry of entries) {
      await entry.handler(...args);
    }
  }

  apply_filters<T>(name: string, value: T, ...args: unknown[]): T {
    const entries = this.filters.get(name) ?? [];
    let result = value;
    for (const entry of entries) {
      result = entry.handler(result, ...args) as T;
    }
    return result;
  }

  register_filter<T>(name: string, handler: FilterHandler<T>, priority = 10): string {
    const id = `filter_${this.next_id++}`;
    const entry = { id, priority, handler: handler as FilterHandler };
    const list = this.filters.get(name) ?? [];
    list.push(entry);
    list.sort((a, b) => a.priority - b.priority);
    this.filters.set(name, list);
    return id;
  }

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

export const hooks = new HookRegistry();

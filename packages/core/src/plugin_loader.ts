import type { Capability } from '@typepress/shared-types';
import { hooks } from './hooks';

export interface Plugin {
  name: string;
  version: string;
  required_capabilities?: Capability[];
  register: (core: PluginAPI) => void | Promise<void>;
}

export interface PluginAPI {
  hooks: typeof hooks;
}

export class PluginManager {
  private loaded = new Map<string, Plugin>();

  async load(plugin: Plugin): Promise<void> {
    if (this.loaded.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already loaded`);
    }

    await plugin.register({ hooks });
    this.loaded.set(plugin.name, plugin);
  }

  get(name: string): Plugin | undefined {
    return this.loaded.get(name);
  }

  get_all(): Plugin[] {
    return [...this.loaded.values()];
  }

  has(name: string): boolean {
    return this.loaded.has(name);
  }

  unload(name: string): boolean {
    return this.loaded.delete(name);
  }
}

/**
 * FeatureRegistry — The extensibility backbone for Typepress's API layer.
 *
 * Each feature (auth, content, media, taxonomy) implements the FeaturePlugin
 * interface and registers with this registry. The registry resolves dependency
 * order and boots features as Fastify plugins with automatic route prefixing.
 *
 * Adding a new feature:
 *   1. Create a directory under apps/api/src/features/your_feature/
 *   2. Implement the FeaturePlugin interface
 *   3. Import and register it in apps/api/src/features/index.ts
 *
 * No existing code needs to be modified — that's the whole point.
 */
import type { FastifyInstance } from 'fastify';
import type { HookRegistry } from './hooks';

/**
 * Contract every feature must implement.
 * Features are essentially Fastify plugins with metadata and dependency declarations.
 */
export interface FeaturePlugin {
  /** Unique feature name — used as route prefix (/api/{name}) and in logs. */
  name: string;
  /** Semantic version. */
  version: string;
  /** Names of features that must be registered before this one. */
  dependencies?: string[];
  /**
   * Fastify plugin function. Registers routes, hooks, and initialization logic.
   * Receives the Fastify instance scoped to /api/{feature_name}.
   */
  register: (app: FastifyInstance, context: FeatureContext) => void | Promise<void>;
}

/** Context passed to features during registration — provides access to shared infra. */
export interface FeatureContext {
  hooks: HookRegistry;
  // Future: config, logger, event bus, etc.
}

export class FeatureRegistry {
  /** Registered features keyed by name. */
  private features = new Map<string, FeaturePlugin>();

  /** Order in which features were registered (for dependency resolution). */
  private registered_order: string[] = [];

  /**
   * Register a feature. Validates that dependencies are already registered.
   * @throws Error if duplicate registration or missing dependency.
   */
  async register(feature: FeaturePlugin): Promise<void> {
    if (this.features.has(feature.name)) {
      throw new Error(`Feature "${feature.name}" is already registered`);
    }

    if (feature.dependencies) {
      for (const dep of feature.dependencies) {
        if (!this.features.has(dep)) {
          throw new Error(
            `Feature "${feature.name}" depends on "${dep}", which is not registered.`,
          );
        }
      }
    }

    this.features.set(feature.name, feature);
    this.registered_order.push(feature.name);
  }

  get(name: string): FeaturePlugin | undefined {
    return this.features.get(name);
  }

  get_all(): readonly FeaturePlugin[] {
    return this.registered_order.map((name) => this.features.get(name)!);
  }

  has(name: string): boolean {
    return this.features.has(name);
  }

  /**
   * Topological sort — returns feature names in dependency-resolved order.
   * Detects circular dependencies at resolution time.
   */
  resolve_order(): string[] {
    const resolved: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected involving feature "${name}"`);
      }
      visiting.add(name);

      const feature = this.features.get(name);
      if (feature?.dependencies) {
        for (const dep of feature.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(name);
      visited.add(name);
      resolved.push(name);
    };

    for (const name of this.registered_order) {
      visit(name);
    }

    return resolved;
  }
}

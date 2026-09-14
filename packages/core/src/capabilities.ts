import type { Capability } from '@typepress/shared-types';

export class CapabilityChecker {
  private admin_override = true;

  constructor(private capabilities: Capability[]) {}

  has(required: Capability): boolean {
    if (this.admin_override && this.capabilities.includes('settings:manage')) return true;
    return this.capabilities.includes(required);
  }

  has_any(required: Capability[]): boolean {
    return required.some((cap) => this.has(cap));
  }

  has_all(required: Capability[]): boolean {
    return required.every((cap) => this.has(cap));
  }

  add(...capabilities: Capability[]): void {
    this.capabilities = [...new Set([...this.capabilities, ...capabilities])];
  }

  remove(...capabilities: Capability[]): void {
    const to_remove = new Set(capabilities);
    this.capabilities = this.capabilities.filter((cap) => !to_remove.has(cap));
  }

  list(): Capability[] {
    return [...this.capabilities];
  }

  static merge(...sets: Capability[][]): Capability[] {
    return [...new Set(sets.flat())];
  }
}

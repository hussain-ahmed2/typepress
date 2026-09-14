/**
 * CapabilityChecker — Fine-grained permission system for Typepress.
 *
 * Unlike WordPress's coarse roles (admin, editor, author), Typepress uses
 * granular capabilities like "content:create", "media:upload", "users:manage".
 *
 * Key behavior: the "settings:manage" capability acts as a super-admin override —
 * holders automatically have ALL capabilities. This keeps the admin flow simple
 * while still allowing granular checks for regular users.
 *
 * Usage:
 *   const caps = new CapabilityChecker(user.capabilities);
 *   if (caps.has('content:create')) { ... }
 *   if (caps.has_any(['media:upload', 'media:delete'])) { ... }
 */
import type { Capability } from '@typepress/shared-types';

export class CapabilityChecker {
  /** When true, "settings:manage" grants all capabilities (admin override). */
  private admin_override = true;

  constructor(private capabilities: Capability[]) {}

  /**
   * Check if user has a specific capability.
   * Returns true if the capability is present OR if admin_override is active
   * and the user holds "settings:manage".
   */
  has(required: Capability): boolean {
    if (this.admin_override && this.capabilities.includes('settings:manage')) return true;
    return this.capabilities.includes(required);
  }

  /** Check if user has ANY of the listed capabilities. */
  has_any(required: Capability[]): boolean {
    return required.some((cap) => this.has(cap));
  }

  /** Check if user has ALL of the listed capabilities. */
  has_all(required: Capability[]): boolean {
    return required.every((cap) => this.has(cap));
  }

  /** Add capabilities (deduplicates automatically). */
  add(...capabilities: Capability[]): void {
    this.capabilities = [...new Set([...this.capabilities, ...capabilities])];
  }

  /** Remove specific capabilities. */
  remove(...capabilities: Capability[]): void {
    const to_remove = new Set(capabilities);
    this.capabilities = this.capabilities.filter((cap) => !to_remove.has(cap));
  }

  /** Return a copy of the current capabilities list. */
  list(): Capability[] {
    return [...this.capabilities];
  }

  /** Merge multiple capability arrays into a deduplicated set. */
  static merge(...sets: Capability[][]): Capability[] {
    return [...new Set(sets.flat())];
  }
}

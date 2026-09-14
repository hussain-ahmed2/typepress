import { describe, it, expect } from 'vitest';
import { CapabilityChecker } from '../capabilities';
import type { Capability } from '@typepress/shared-types';

describe('CapabilityChecker', () => {
  const admin_caps: Capability[] = ['settings:manage', 'content:create', 'content:edit:any'];

  it('should check single capability', () => {
    const checker = new CapabilityChecker(['content:create', 'content:edit:own']);

    expect(checker.has('content:create')).toBe(true);
    expect(checker.has('users:manage')).toBe(false);
  });

  it('should grant all capabilities to settings:manage holder', () => {
    const checker = new CapabilityChecker(['settings:manage']);

    expect(checker.has('content:create')).toBe(true);
    expect(checker.has('users:manage')).toBe(true);
    expect(checker.has('plugins:install')).toBe(true);
  });

  it('should check any capability', () => {
    const checker = new CapabilityChecker(['content:create']);

    expect(checker.has_any(['content:create', 'users:manage'])).toBe(true);
    expect(checker.has_any(['users:manage', 'plugins:install'])).toBe(false);
  });

  it('should check all capabilities', () => {
    const checker = new CapabilityChecker(['content:create', 'content:edit:own']);

    expect(checker.has_all(['content:create', 'content:edit:own'])).toBe(true);
    expect(checker.has_all(['content:create', 'users:manage'])).toBe(false);
  });

  it('should add capabilities', () => {
    const checker = new CapabilityChecker(['content:create']);

    checker.add('users:manage', 'media:upload');

    expect(checker.has('users:manage')).toBe(true);
    expect(checker.has('media:upload')).toBe(true);
  });

  it('should not duplicate capabilities', () => {
    const checker = new CapabilityChecker(['content:create']);

    checker.add('content:create', 'content:create');

    expect(checker.list()).toEqual(['content:create']);
  });

  it('should remove capabilities', () => {
    const checker = new CapabilityChecker(['content:create', 'users:manage']);

    checker.remove('users:manage');

    expect(checker.has('users:manage')).toBe(false);
    expect(checker.has('content:create')).toBe(true);
  });

  it('should list capabilities', () => {
    const caps: Capability[] = ['content:create', 'media:upload'];
    const checker = new CapabilityChecker(caps);

    expect(checker.list()).toEqual(['content:create', 'media:upload']);
  });

  it('should return copy from list (not reference)', () => {
    const checker = new CapabilityChecker(['content:create']);

    const list = checker.list();
    list.push('users:manage');

    expect(checker.list()).toEqual(['content:create']);
  });

  it('should merge capability sets statically', () => {
    const set_a: Capability[] = ['content:create', 'media:upload'];
    const set_b: Capability[] = ['media:upload', 'users:manage'];

    const merged = CapabilityChecker.merge(set_a, set_b);

    expect(merged).toEqual(['content:create', 'media:upload', 'users:manage']);
  });
});

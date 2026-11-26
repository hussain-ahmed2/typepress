import { describe, expect, it } from 'vitest';
import { parse_plugin_manifest } from '../plugin_manifest';

describe('parse_plugin_manifest', () => {
  it('parses a valid manifest with optional metadata', () => {
    const result = parse_plugin_manifest({
      name: 'seo',
      version: '1.0.0',
      description: 'SEO plugin',
      author: 'Typepress',
      slots: ['content_meta'],
      admin: { category: 'Marketing', settings_path: '/settings/seo' },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.manifest).toEqual({
      name: 'seo',
      version: '1.0.0',
      description: 'SEO plugin',
      author: 'Typepress',
      slots: ['content_meta'],
      admin: { category: 'Marketing', settings_path: '/settings/seo' },
    });
  });

  it('rejects missing required fields', () => {
    const result = parse_plugin_manifest({ description: 'missing name/version' });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('"name" is required and must be a non-empty string');
    expect(result.errors).toContain('"version" is required and must be a non-empty string');
  });

  it('rejects invalid optional field types', () => {
    const result = parse_plugin_manifest({
      name: 'bad-plugin',
      version: '1.0.0',
      slots: ['ok', 123],
      admin: 'nope',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('"slots" must be an array of non-empty strings when provided');
    expect(result.errors).toContain('"admin" must be an object when provided');
  });
});

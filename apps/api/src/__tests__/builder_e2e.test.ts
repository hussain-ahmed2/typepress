/**
 * Builder E2E Test — Tests the visual builder functionality.
 */
import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE = 'http://localhost:8000';

async function api_request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  return response.json();
}

describe('Builder E2E Tests', () => {
  beforeAll(async () => {
    const health = await api_request('/health');
    expect(health.status).toBe('ok');
  });

  it('should have API running with plugins', async () => {
    const result = await api_request('/health');
    expect(result.status).toBe('ok');
    expect(result.plugins.length).toBeGreaterThan(10);
  });

  it('should list content (no auth required)', async () => {
    const result = await api_request('/api/content');
    expect(result.success).toBe(true);
    expect(result.pagination).toBeDefined();
  });

  it('should search content', async () => {
    const result = await api_request('/api/search?q=test');
    expect(result.success).toBe(true);
  });

  it('should generate RSS feed', async () => {
    const response = await fetch(`${API_BASE}/feed`);
    expect(response.headers.get('content-type')).toContain('xml');
  });

  it('should generate sitemap', async () => {
    const response = await fetch(`${API_BASE}/sitemap.xml`);
    expect(response.headers.get('content-type')).toContain('xml');
  });

  it('should execute GraphQL query', async () => {
    const result = await api_request('/api/graphql', {
      method: 'POST',
      body: JSON.stringify({ query: '{ health { status uptime } }' }),
    });
    expect(result.data.health.status).toBe('ok');
  });

  it('should require auth for content creation', async () => {
    const result = await api_request('/api/content', {
      method: 'POST',
      body: JSON.stringify({ type: 'page', slug: 'test', title: 'Test' }),
    });
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 404 for nonexistent content', async () => {
    const result = await api_request('/api/content/nonexistent');
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('NOT_FOUND');
  });
});

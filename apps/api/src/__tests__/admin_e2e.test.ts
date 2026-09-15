/**
 * Admin Pages E2E Tests — Comprehensive testing of all admin functionality.
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

describe('Admin Pages E2E', () => {
  beforeAll(async () => {
    const health = await api_request('/health');
    expect(health.status).toBe('ok');
  });

  describe('Health & API', () => {
    it('should return health status', async () => {
      const result = await api_request('/health');
      expect(result.status).toBe('ok');
      expect(result.uptime).toBeGreaterThan(0);
    });

    it('should have all features registered', async () => {
      const result = await api_request('/health');
      expect(result.features).toContain('auth');
      expect(result.features).toContain('content');
      expect(result.features).toContain('media');
      expect(result.features).toContain('taxonomy');
    });

    it('should have all plugins loaded', async () => {
      const result = await api_request('/health');
      expect(result.plugins.length).toBeGreaterThanOrEqual(18);
    });
  });

  describe('Content API', () => {
    it('should list content with pagination', async () => {
      const result = await api_request('/api/content?page=1&limit=10');
      expect(result.success).toBe(true);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
    });

    it('should filter by type', async () => {
      const result = await api_request('/api/content?type=post');
      expect(result.success).toBe(true);
    });

    it('should return 404 for nonexistent content', async () => {
      const result = await api_request('/api/content/nonexistent-id');
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Taxonomy API', () => {
    it('should list taxonomies', async () => {
      const result = await api_request('/api/taxonomy');
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Menu API', () => {
    it('should list menus', async () => {
      const result = await api_request('/api/menus');
      expect(result.success).toBe(true);
    });
  });

  describe('Search API', () => {
    it('should search content', async () => {
      const result = await api_request('/api/search?q=test');
      expect(result.success).toBe(true);
    });
  });

  describe('RSS Feed', () => {
    it('should generate RSS feed', async () => {
      const response = await fetch(`${API_BASE}/feed`);
      expect(response.headers.get('content-type')).toContain('xml');
    });
  });

  describe('Sitemap', () => {
    it('should generate sitemap', async () => {
      const response = await fetch(`${API_BASE}/sitemap.xml`);
      expect(response.headers.get('content-type')).toContain('xml');
    });
  });

  describe('GraphQL', () => {
    it('should execute GraphQL query', async () => {
      const result = await api_request('/api/graphql', {
        method: 'POST',
        body: JSON.stringify({ query: '{ health { status uptime } }' }),
      });
      expect(result.data.health.status).toBe('ok');
    });
  });

  describe('Security', () => {
    it('should have security headers', async () => {
      const response = await fetch(`${API_BASE}/health`);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    });
  });
});

/**
 * Admin Pages E2E Tests — Comprehensive testing of all admin functionality.
 *
 * Gated behind RUN_E2E=true or E2E_API_BASE to avoid failures in clean CI envs.
 * Run: RUN_E2E=true pnpm test:run
 */
import { describe, it, expect, beforeAll } from 'vitest';

/** Env gate: these tests require a running API server. */
const RUN_E2E: boolean = process.env.RUN_E2E === 'true' || Boolean(process.env.E2E_API_BASE);
/** Base URL for the running API under test. */
const API_BASE: string = process.env.E2E_API_BASE ?? 'http://localhost:8000';

/** Loose API response shape for e2e assertions. */
interface E2eApiResponse {
  success?: boolean;
  status?: string;
  uptime?: number;
  features?: string[];
  plugins?: unknown[];
  pagination?: { page: number; limit?: number; total?: number; total_pages?: number };
  data?: unknown;
  error?: { code: string; message?: string };
  [key: string]: unknown;
}

async function api_request(path: string, options: RequestInit = {}): Promise<E2eApiResponse> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  return (await response.json()) as E2eApiResponse;
}

describe.runIf(RUN_E2E)('Admin Pages E2E', () => {
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
      expect(result.plugins?.length).toBeGreaterThanOrEqual(18);
    });
  });

  describe('Content API', () => {
    it('should list content with pagination', async () => {
      const result = await api_request('/api/content?page=1&limit=10');
      expect(result.success).toBe(true);
      expect(result.pagination).toBeDefined();
      expect(result.pagination?.page).toBe(1);
    });

    it('should filter by type', async () => {
      const result = await api_request('/api/content?type=post');
      expect(result.success).toBe(true);
    });

    it('should return 404 for nonexistent content', async () => {
      const result = await api_request('/api/content/nonexistent-id');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
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
      const data = result.data as { health?: { status?: string } } | undefined;
      expect(data?.health?.status).toBe('ok');
    });
  });

  describe('Security', () => {
    it('should have security headers', async () => {
      const response = await fetch(`${API_BASE}/health`);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    });
  });
});

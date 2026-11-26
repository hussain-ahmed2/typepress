/**
 * Builder E2E Test — Tests the visual builder functionality.
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

describe.runIf(RUN_E2E)('Builder E2E Tests', () => {
  beforeAll(async () => {
    const health = await api_request('/health');
    expect(health.status).toBe('ok');
  });

  it('should have API running with plugins', async () => {
    const result = await api_request('/health');
    expect(result.status).toBe('ok');
    expect(result.plugins?.length).toBeGreaterThan(10);
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
    const data = result.data as { health?: { status?: string } } | undefined;
    expect(data?.health?.status).toBe('ok');
  });

  it('should require auth for content creation', async () => {
    const result = await api_request('/api/content', {
      method: 'POST',
      body: JSON.stringify({ type: 'page', slug: 'test', title: 'Test' }),
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('UNAUTHORIZED');
  });

  it('should return 404 for nonexistent content', async () => {
    const result = await api_request('/api/content/nonexistent');
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('NOT_FOUND');
  });
});

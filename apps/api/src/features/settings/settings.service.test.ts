/**
 * Settings Service Tests — Verifies settings persistence defaults and merge behavior.
 *
 * Drizzle db is mocked so tests run without a database.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type MockFn = ReturnType<typeof vi.fn>;

type SelectChain = PromiseLike<unknown> & Record<'from' | 'innerJoin' | 'leftJoin' | 'where' | 'orderBy' | 'limit' | 'offset' | 'groupBy', MockFn>;

/** Creates a chainable Drizzle select builder that resolves to `result` when awaited. */
function create_select_chain(result: unknown): SelectChain {
  const promise = Promise.resolve(result);
  const chain: SelectChain = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    groupBy: vi.fn(),
    then: promise.then.bind(promise),
  };
  const methods = ['from', 'innerJoin', 'leftJoin', 'where', 'orderBy', 'limit', 'offset', 'groupBy'] as const;
  for (const method of methods) {
    chain[method].mockReturnValue(chain);
  }
  return chain;
}

/** Creates a chainable Drizzle insert builder supporting onConflictDoUpdate(...).returning(). */
function create_insert_chain(result: unknown): { values: MockFn; onConflictDoUpdate: MockFn; returning: MockFn } {
  const chain = {
    values: vi.fn(),
    onConflictDoUpdate: vi.fn(),
    returning: vi.fn().mockResolvedValue(result),
  };
  chain.values.mockReturnValue(chain);
  chain.onConflictDoUpdate.mockReturnValue(chain);
  return chain;
}

vi.mock('@typepress/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  settings: { key: 'settings.key', value: 'settings.value' },
}));

import { db } from '@typepress/db';
import { DEFAULT_SITE_SETTINGS, SettingsService } from './settings.service';

const mock_db = db as unknown as {
  select: MockFn;
  insert: MockFn;
};

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SettingsService();
  });

  describe('get_site_settings', () => {
    it('returns defaults when no setting row exists', async () => {
      mock_db.select.mockReturnValueOnce(create_select_chain([]));

      const result = await service.get_site_settings();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(DEFAULT_SITE_SETTINGS);
      expect(mock_db.select).toHaveBeenCalledTimes(1);
    });

    it('merges stored values over defaults', async () => {
      mock_db.select.mockReturnValueOnce(create_select_chain([{
        value: { site_title: 'My Site', admin_email: 'ops@example.com' },
      }]));

      const result = await service.get_site_settings();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        ...DEFAULT_SITE_SETTINGS,
        site_title: 'My Site',
        admin_email: 'ops@example.com',
      });
    });
  });

  describe('update_site_settings', () => {
    it('upserts merged settings and returns normalized data', async () => {
      // get_site_settings() read during update.
      mock_db.select.mockReturnValueOnce(create_select_chain([{
        value: { ...DEFAULT_SITE_SETTINGS, site_title: 'Old Title' },
      }]));
      const insert_chain = create_insert_chain([{
        value: { ...DEFAULT_SITE_SETTINGS, site_title: 'New Title' },
      }]);
      mock_db.insert.mockReturnValueOnce(insert_chain);

      const result = await service.update_site_settings({ site_title: 'New Title' });

      expect(result.success).toBe(true);
      expect(result.data?.site_title).toBe('New Title');
      expect(insert_chain.values).toHaveBeenCalledWith({
        key: 'site',
        value: { ...DEFAULT_SITE_SETTINGS, site_title: 'New Title' },
      });
      expect(insert_chain.onConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          set: { value: { ...DEFAULT_SITE_SETTINGS, site_title: 'New Title' } },
        }),
      );
    });
  });
});

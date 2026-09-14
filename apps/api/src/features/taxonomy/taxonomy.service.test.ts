/**
 * Taxonomy Service Tests — Unit tests for taxonomy CRUD operations.
 *
 * Prisma is mocked to avoid requiring a running database.
 * Tests verify slug uniqueness, hierarchy, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@typepress/db', () => ({
  prisma: {
    taxonomy: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '@typepress/db';
import { TaxonomyService } from './taxonomy.service';

const mock_taxonomy = prisma as unknown as {
  taxonomy: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

describe('TaxonomyService', () => {
  let service: TaxonomyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TaxonomyService();
  });

  describe('list', () => {
    it('should return all taxonomies', async () => {
      mock_taxonomy.taxonomy.findMany.mockResolvedValue([
        { id: '1', name: 'Tech', slug: 'tech', type: 'category', children: [] },
      ]);

      const result = await service.list({});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should filter by type', async () => {
      mock_taxonomy.taxonomy.findMany.mockResolvedValue([]);

      await service.list({ type: 'tag' });

      expect(mock_taxonomy.taxonomy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { type: 'tag' } }),
      );
    });
  });

  describe('create', () => {
    it('should create taxonomy with valid data', async () => {
      mock_taxonomy.taxonomy.findUnique.mockResolvedValue(null);
      mock_taxonomy.taxonomy.create.mockResolvedValue({ id: '1', name: 'New', slug: 'new' });

      const result = await service.create({ name: 'New', slug: 'new', type: 'category' });

      expect(result.success).toBe(true);
    });

    it('should reject duplicate slugs', async () => {
      mock_taxonomy.taxonomy.findUnique.mockResolvedValue({ id: 'existing' });

      const result = await service.create({ name: 'Dup', slug: 'existing', type: 'category' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONFLICT');
    });
  });

  describe('delete', () => {
    it('should delete existing taxonomy', async () => {
      mock_taxonomy.taxonomy.findUnique.mockResolvedValue({ id: '1' });
      mock_taxonomy.taxonomy.delete.mockResolvedValue({});

      const result = await service.delete('1');

      expect(result.success).toBe(true);
    });

    it('should return 404 for nonexistent taxonomy', async () => {
      mock_taxonomy.taxonomy.findUnique.mockResolvedValue(null);

      const result = await service.delete('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });
});

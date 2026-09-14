/**
 * Content Service Tests — Unit tests for content CRUD operations.
 *
 * Prisma is mocked to avoid requiring a running database.
 * Tests verify business logic: slug uniqueness, soft delete, pagination.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma before importing the service
vi.mock('@typepress/db', () => ({
  prisma: {
    content: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    taxonomyRelation: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from '@typepress/db';
import { ContentService } from './content.service';

const mock_content = prisma as unknown as {
  content: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  taxonomyRelation: {
    createMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

describe('ContentService', () => {
  let service: ContentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContentService();
  });

  describe('list', () => {
    it('should return paginated content', async () => {
      mock_content.content.findMany.mockResolvedValue([
        { id: '1', title: 'Test', slug: 'test', type: 'post', status: 'PUBLISHED', author: { name: 'Admin' }, created_at: new Date(), updated_at: new Date() },
      ]);
      mock_content.content.count.mockResolvedValue(1);

      const result = await service.list({ page: 1, limit: 20, sort: 'created_at', order: 'desc' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.pagination?.total).toBe(1);
    });

    it('should filter by type', async () => {
      mock_content.content.findMany.mockResolvedValue([]);
      mock_content.content.count.mockResolvedValue(0);

      await service.list({ page: 1, limit: 20, type: 'page', sort: 'created_at', order: 'desc' });

      expect(mock_content.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { type: 'page' } }),
      );
    });
  });

  describe('get_by_id', () => {
    it('should return content when found', async () => {
      mock_content.content.findUnique.mockResolvedValue({
        id: '1', title: 'Test', slug: 'test', author: { name: 'Admin' }, taxonomies: [],
      });

      const result = await service.get_by_id('1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return 404 when not found', async () => {
      mock_content.content.findUnique.mockResolvedValue(null);

      const result = await service.get_by_id('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('create', () => {
    it('should create content with valid data', async () => {
      mock_content.content.findUnique.mockResolvedValue(null);
      mock_content.content.create.mockResolvedValue({ id: '1', title: 'New Post', slug: 'new-post' });

      const result = await service.create(
        { type: 'post', slug: 'new-post', title: 'New Post', status: 'DRAFT', meta: {}, taxonomy_ids: [] },
        'author-1',
      );

      expect(result.success).toBe(true);
      expect(mock_content.content.create).toHaveBeenCalled();
    });

    it('should reject duplicate slugs', async () => {
      mock_content.content.findUnique.mockResolvedValue({ id: 'existing' });

      const result = await service.create(
        { type: 'post', slug: 'existing-slug', title: 'Test', status: 'DRAFT', meta: {}, taxonomy_ids: [] },
        'author-1',
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONFLICT');
    });
  });

  describe('delete', () => {
    it('should soft delete (move to trash)', async () => {
      mock_content.content.findUnique.mockResolvedValue({ id: '1' });
      mock_content.content.update.mockResolvedValue({});

      const result = await service.delete('1');

      expect(result.success).toBe(true);
      expect(mock_content.content.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'TRASH' },
      });
    });

    it('should return 404 for nonexistent content', async () => {
      mock_content.content.findUnique.mockResolvedValue(null);

      const result = await service.delete('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });
});

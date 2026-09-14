/**
 * Content Service — Business logic for content CRUD operations.
 *
 * Handles all database interactions for the Content model, including:
 *   - Paginated listing with type/status filtering
 *   - Lookup by ID or slug
 *   - Creation with taxonomy association
 *   - Update with slug uniqueness checking
 *   - Soft delete (status → TRASH)
 *
 * All methods return ApiResponse for consistent API responses.
 */
import { prisma } from '@typepress/db';
import type { ApiResponse, PaginatedResponse } from '@typepress/shared-types';
import type { CreateContentInput, UpdateContentInput, ListContentQuery } from './content.validators';

interface ContentListItem {
  id: string;
  type: string;
  slug: string;
  title: string;
  status: string;
  author_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export class ContentService {
  /**
   * List content with pagination and optional filtering.
   * Returns paginated results with total count for UI pagination.
   */
  async list(query: ListContentQuery): Promise<PaginatedResponse<ContentListItem>> {
    const { page, limit, type, status, sort, order } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.content.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort]: order },
        include: { author: { select: { name: true } } },
      }),
      prisma.content.count({ where }),
    ]);

    return {
      success: true,
      data: items.map((c) => ({
        id: c.id,
        type: c.type,
        slug: c.slug,
        title: c.title,
        status: c.status,
        author_name: c.author.name,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /** Get a single content item by ID, including author and taxonomy relations. */
  async get_by_id(id: string): Promise<ApiResponse> {
    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        author: { select: { name: true } },
        taxonomies: {
          include: { taxonomy: { select: { id: true, name: true, slug: true, type: true } } },
        },
      },
    });

    if (!content) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Content not found' },
      };
    }

    return {
      success: true,
      data: {
        ...content,
        author_name: content.author.name,
        taxonomies: content.taxonomies.map((t) => t.taxonomy),
      },
    };
  }

  /** Get a single content item by slug — used by the public renderer. */
  async get_by_slug(slug: string): Promise<ApiResponse> {
    const content = await prisma.content.findUnique({
      where: { slug },
      include: {
        author: { select: { name: true } },
        taxonomies: {
          include: { taxonomy: { select: { id: true, name: true, slug: true, type: true } } },
        },
      },
    });

    if (!content) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Content not found' },
      };
    }

    return {
      success: true,
      data: {
        ...content,
        author_name: content.author.name,
        taxonomies: content.taxonomies.map((t) => t.taxonomy),
      },
    };
  }

  /**
   * Create new content with optional taxonomy associations.
   * Checks slug uniqueness before creation.
   */
  async create(data: CreateContentInput, author_id: string): Promise<ApiResponse> {
    const existing = await prisma.content.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return {
        success: false,
        error: { code: 'CONFLICT', message: 'A content with this slug already exists' },
      };
    }

    const content = await prisma.content.create({
      data: {
        type: data.type,
        slug: data.slug,
        title: data.title,
        status: data.status,
        meta: data.meta as never,
        author_id,
      },
    });

    if (data.taxonomy_ids && data.taxonomy_ids.length > 0) {
      await prisma.taxonomyRelation.createMany({
        data: data.taxonomy_ids.map((taxonomy_id) => ({
          content_id: content.id,
          taxonomy_id,
        })),
      });
    }

    return { success: true, data: content };
  }

  /**
   * Update existing content. Only provided fields are updated.
   * Replaces taxonomy associations if taxonomy_ids is provided.
   */
  async update(id: string, data: UpdateContentInput): Promise<ApiResponse> {
    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Content not found' },
      };
    }

    if (data.slug && data.slug !== existing.slug) {
      const slug_taken = await prisma.content.findUnique({ where: { slug: data.slug } });
      if (slug_taken) {
        return {
          success: false,
          error: { code: 'CONFLICT', message: 'Slug already taken' },
        };
      }
    }

    const update_data: Record<string, unknown> = {};
    if (data.slug !== undefined) update_data.slug = data.slug;
    if (data.title !== undefined) update_data.title = data.title;
    if (data.status !== undefined) update_data.status = data.status;
    if (data.meta !== undefined) update_data.meta = data.meta as never;

    const content = await prisma.content.update({
      where: { id },
      data: update_data as never,
    });

    // Replace taxonomy associations if explicitly provided
    if (data.taxonomy_ids !== undefined) {
      await prisma.taxonomyRelation.deleteMany({ where: { content_id: id } });
      if (data.taxonomy_ids.length > 0) {
        await prisma.taxonomyRelation.createMany({
          data: data.taxonomy_ids.map((taxonomy_id) => ({
            content_id: id,
            taxonomy_id,
          })),
        });
      }
    }

    return { success: true, data: content };
  }

  /** Soft delete — moves content to TRASH status instead of hard deleting. */
  async delete(id: string): Promise<ApiResponse> {
    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Content not found' },
      };
    }

    await prisma.content.update({
      where: { id },
      data: { status: 'TRASH' },
    });

    return { success: true, data: { message: 'Content moved to trash' } };
  }
}

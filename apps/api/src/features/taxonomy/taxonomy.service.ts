/**
 * Taxonomy Service — Business logic for taxonomy CRUD.
 *
 * Handles hierarchical taxonomies (categories with children) and
 * flat taxonomies (tags). The `type` field distinguishes them.
 */
import { prisma } from '@typepress/db';
import type { ApiResponse } from '@typepress/shared-types';
import type { CreateTaxonomyInput, UpdateTaxonomyInput, ListTaxonomyQuery } from './taxonomy.validators';

export class TaxonomyService {
  /** List taxonomies, optionally filtered by type. Includes child relationships. */
  async list(query: ListTaxonomyQuery): Promise<ApiResponse> {
    const where: Record<string, unknown> = {};
    if (query.type) where.type = query.type;

    const taxonomies = await prisma.taxonomy.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        children: { select: { id: true, name: true, slug: true, type: true } },
      },
    });

    return { success: true, data: taxonomies };
  }

  /** Get a single taxonomy by ID with parent and children. */
  async get_by_id(id: string): Promise<ApiResponse> {
    const taxonomy = await prisma.taxonomy.findUnique({
      where: { id },
      include: {
        children: { select: { id: true, name: true, slug: true, type: true } },
        parent: { select: { id: true, name: true, slug: true, type: true } },
      },
    });

    if (!taxonomy) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Taxonomy not found' },
      };
    }

    return { success: true, data: taxonomy };
  }

  /** Create a new taxonomy. Checks slug uniqueness first. */
  async create(data: CreateTaxonomyInput): Promise<ApiResponse> {
    const existing = await prisma.taxonomy.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return {
        success: false,
        error: { code: 'CONFLICT', message: 'A taxonomy with this slug already exists' },
      };
    }

    const taxonomy = await prisma.taxonomy.create({
      data: {
        name: data.name,
        slug: data.slug,
        type: data.type,
        parent_id: data.parent_id,
      },
    });

    return { success: true, data: taxonomy };
  }

  /** Update an existing taxonomy. Only provided fields are updated. */
  async update(id: string, data: UpdateTaxonomyInput): Promise<ApiResponse> {
    const existing = await prisma.taxonomy.findUnique({ where: { id } });
    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Taxonomy not found' },
      };
    }

    if (data.slug && data.slug !== existing.slug) {
      const slug_taken = await prisma.taxonomy.findUnique({ where: { slug: data.slug } });
      if (slug_taken) {
        return {
          success: false,
          error: { code: 'CONFLICT', message: 'Slug already taken' },
        };
      }
    }

    const update_data: Record<string, unknown> = {};
    if (data.name !== undefined) update_data.name = data.name;
    if (data.slug !== undefined) update_data.slug = data.slug;
    if (data.parent_id !== undefined) update_data.parent_id = data.parent_id;

    const taxonomy = await prisma.taxonomy.update({
      where: { id },
      data: update_data,
    });

    return { success: true, data: taxonomy };
  }

  /** Delete a taxonomy. Associated content links are cascade-deleted by Prisma. */
  async delete(id: string): Promise<ApiResponse> {
    const existing = await prisma.taxonomy.findUnique({ where: { id } });
    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Taxonomy not found' },
      };
    }

    await prisma.taxonomy.delete({ where: { id } });
    return { success: true, data: { message: 'Taxonomy deleted' } };
  }
}

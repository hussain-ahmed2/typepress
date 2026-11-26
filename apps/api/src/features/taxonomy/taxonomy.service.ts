/**
 * Taxonomy Service — Business logic for taxonomy CRUD.
 *
 * Handles hierarchical taxonomies (categories with children) and
 * flat taxonomies (tags). The `type` field distinguishes them.
 */
import { randomUUID } from 'node:crypto';
import { asc, eq, inArray } from 'drizzle-orm';
import { db, taxonomies } from '@typepress/db';
import type { ApiResponse } from '@typepress/shared-types';
import type { CreateTaxonomyInput, UpdateTaxonomyInput, ListTaxonomyQuery } from './taxonomy.validators';

/** Minimal taxonomy fields returned for parent/child references. */
interface TaxonomySummary {
  id: string;
  name: string;
  slug: string;
  type: string;
}

export class TaxonomyService {
  /** Fetch child taxonomy summaries grouped by parent ID. */
  private async get_children_by_parent_ids(parent_ids: string[]): Promise<Map<string, TaxonomySummary[]>> {
    if (parent_ids.length === 0) return new Map();

    const children = await db
      .select({
        id: taxonomies.id,
        name: taxonomies.name,
        slug: taxonomies.slug,
        type: taxonomies.type,
        parent_id: taxonomies.parent_id,
      })
      .from(taxonomies)
      .where(inArray(taxonomies.parent_id, parent_ids));

    const by_parent = new Map<string, TaxonomySummary[]>();
    for (const child of children) {
      if (!child.parent_id) continue;
      const list = by_parent.get(child.parent_id) ?? [];
      list.push({ id: child.id, name: child.name, slug: child.slug, type: child.type });
      by_parent.set(child.parent_id, list);
    }
    return by_parent;
  }

  /** List taxonomies, optionally filtered by type. Includes child relationships. */
  async list(query: ListTaxonomyQuery): Promise<ApiResponse> {
    const where = query.type ? eq(taxonomies.type, query.type) : undefined;

    const rows = await db
      .select()
      .from(taxonomies)
      .where(where)
      .orderBy(asc(taxonomies.name));

    const children_by_parent = await this.get_children_by_parent_ids(rows.map((row) => row.id));
    const data = rows.map((row) => ({
      ...row,
      children: children_by_parent.get(row.id) ?? [],
    }));

    return { success: true, data };
  }

  /** Get a single taxonomy by ID with parent and children. */
  async get_by_id(id: string): Promise<ApiResponse> {
    const [taxonomy] = await db
      .select()
      .from(taxonomies)
      .where(eq(taxonomies.id, id))
      .limit(1);

    if (!taxonomy) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Taxonomy not found' },
      };
    }

    const [children, parent_rows] = await Promise.all([
      db
        .select({
          id: taxonomies.id,
          name: taxonomies.name,
          slug: taxonomies.slug,
          type: taxonomies.type,
        })
        .from(taxonomies)
        .where(eq(taxonomies.parent_id, id)),
      taxonomy.parent_id
        ? db
            .select({
              id: taxonomies.id,
              name: taxonomies.name,
              slug: taxonomies.slug,
              type: taxonomies.type,
            })
            .from(taxonomies)
            .where(eq(taxonomies.id, taxonomy.parent_id))
            .limit(1)
        : Promise.resolve([]),
    ]);

    return {
      success: true,
      data: {
        ...taxonomy,
        children,
        parent: parent_rows[0] ?? null,
      },
    };
  }

  /** Create a new taxonomy. Checks slug uniqueness first. */
  async create(data: CreateTaxonomyInput): Promise<ApiResponse> {
    const [existing] = await db
      .select({ id: taxonomies.id })
      .from(taxonomies)
      .where(eq(taxonomies.slug, data.slug))
      .limit(1);
    if (existing) {
      return {
        success: false,
        error: { code: 'CONFLICT', message: 'A taxonomy with this slug already exists' },
      };
    }

    const [taxonomy] = await db
      .insert(taxonomies)
      .values({
        id: randomUUID(),
        name: data.name,
        slug: data.slug,
        type: data.type,
        parent_id: data.parent_id ?? null,
      })
      .returning();

    return { success: true, data: taxonomy };
  }

  /** Update an existing taxonomy. Only provided fields are updated. */
  async update(id: string, data: UpdateTaxonomyInput): Promise<ApiResponse> {
    const [existing] = await db
      .select()
      .from(taxonomies)
      .where(eq(taxonomies.id, id))
      .limit(1);
    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Taxonomy not found' },
      };
    }

    if (data.slug && data.slug !== existing.slug) {
      const [slug_taken] = await db
        .select({ id: taxonomies.id })
        .from(taxonomies)
        .where(eq(taxonomies.slug, data.slug))
        .limit(1);
      if (slug_taken) {
        return {
          success: false,
          error: { code: 'CONFLICT', message: 'Slug already taken' },
        };
      }
    }

    const update_data: Partial<{ name: string; slug: string; parent_id: string | null }> = {};
    if (data.name !== undefined) update_data.name = data.name;
    if (data.slug !== undefined) update_data.slug = data.slug;
    if (data.parent_id !== undefined) update_data.parent_id = data.parent_id;

    if (Object.keys(update_data).length === 0) {
      return { success: true, data: existing };
    }

    const [taxonomy] = await db
      .update(taxonomies)
      .set(update_data)
      .where(eq(taxonomies.id, id))
      .returning();

    return { success: true, data: taxonomy ?? existing };
  }

  /** Delete a taxonomy. Associated content links are cascade-deleted by the database FK. */
  async delete(id: string): Promise<ApiResponse> {
    const [deleted] = await db
      .delete(taxonomies)
      .where(eq(taxonomies.id, id))
      .returning({ id: taxonomies.id });
    if (!deleted) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Taxonomy not found' },
      };
    }

    return { success: true, data: { message: 'Taxonomy deleted' } };
  }
}

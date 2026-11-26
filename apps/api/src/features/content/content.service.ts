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
import { randomUUID } from 'node:crypto';

import { CapabilityChecker } from '@typepress/core';
import type { HookRegistry } from '@typepress/core';
import { contents, db, taxonomy_relations, taxonomies, users } from '@typepress/db';
import type { ContentStatus } from '@typepress/db';
import type { ApiResponse, Capability, PaginatedResponse } from '@typepress/shared-types';
import { and, asc, desc, eq, sql } from 'drizzle-orm';

import type { CreateContentInput, ListContentQuery, UpdateContentInput } from './content.validators';

export interface ContentActor {
  user_id: string;
  capabilities: Capability[];
}

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

/** Payload emitted before a content update is persisted. */
export interface ContentBeforeUpdatePayload {
  content_id: string;
  actor_id: string;
  snapshot: {
    title: string;
    slug: string;
    type: string;
    status: string;
    meta: unknown;
    published_at: Date | null;
    password: string | null;
    is_sticky: boolean;
    format: string;
  };
}

/** Content row shape used by this service. */
interface ContentRow {
  id: string;
  type: string;
  slug: string;
  title: string;
  status: ContentStatus;
  meta: Record<string, unknown>;
  author_id: string;
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
  password: string | null;
  is_sticky: boolean;
  format: string;
}

/** Taxonomy shape attached to content detail responses. */
interface ContentTaxonomy {
  id: string;
  name: string;
  slug: string;
  type: string;
}

export class ContentService {
  constructor(private readonly hooks?: HookRegistry) {}

  private can_edit_content(actor: ContentActor, author_id: string): boolean {
    const caps = new CapabilityChecker(actor.capabilities);
    if (caps.has('content:edit:any')) return true;
    return caps.has('content:edit:own') && actor.user_id === author_id;
  }

  private can_publish(actor: ContentActor): boolean {
    const caps = new CapabilityChecker(actor.capabilities);
    return caps.has('content:publish');
  }

  /** Maps list query sort key to the corresponding Drizzle column. */
  private get_sort_column(sort: ListContentQuery['sort']) {
    if (sort === 'title') return contents.title;
    if (sort === 'updated_at') return contents.updated_at;
    if (sort === 'published_at') return contents.published_at;
    return contents.created_at;
  }

  /** Loads taxonomy objects attached to a content item. */
  private async get_content_taxonomies(content_id: string): Promise<ContentTaxonomy[]> {
    const rows = await db
      .select({
        id: taxonomies.id,
        name: taxonomies.name,
        slug: taxonomies.slug,
        type: taxonomies.type,
      })
      .from(taxonomy_relations)
      .innerJoin(taxonomies, eq(taxonomy_relations.taxonomy_id, taxonomies.id))
      .where(eq(taxonomy_relations.content_id, content_id));

    return rows;
  }

  /**
   * List content with pagination and optional filtering.
   * Returns paginated results with total count for UI pagination.
   */
  async list(query: ListContentQuery): Promise<PaginatedResponse<ContentListItem>> {
    const { page, limit, type, status, sort, order } = query;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (type) conditions.push(eq(contents.type, type));
    if (status) conditions.push(eq(contents.status, status));
    const where_clause = conditions.length > 0 ? and(...conditions) : undefined;

    const sort_column = this.get_sort_column(sort);
    const order_by = order === 'asc' ? asc(sort_column) : desc(sort_column);

    const [items, count_rows] = await Promise.all([
      db
        .select({
          id: contents.id,
          type: contents.type,
          slug: contents.slug,
          title: contents.title,
          status: contents.status,
          author_name: users.name,
          created_at: contents.created_at,
          updated_at: contents.updated_at,
        })
        .from(contents)
        .leftJoin(users, eq(contents.author_id, users.id))
        .where(where_clause)
        .orderBy(order_by)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(contents)
        .where(where_clause),
    ]);

    const total = count_rows[0]?.count ?? 0;

    return {
      success: true,
      data: items.map((c) => ({
        id: c.id,
        type: c.type,
        slug: c.slug,
        title: c.title,
        status: c.status,
        author_name: c.author_name,
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
    const rows = await db
      .select({
        content: contents,
        author_name: users.name,
      })
      .from(contents)
      .leftJoin(users, eq(contents.author_id, users.id))
      .where(eq(contents.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Content not found' },
      };
    }

    const content_taxonomies = await this.get_content_taxonomies(id);

    return {
      success: true,
      data: {
        ...row.content,
        author_name: row.author_name,
        taxonomies: content_taxonomies,
      },
    };
  }

  /** Get a single content item by slug — used by the public renderer. */
  async get_by_slug(slug: string): Promise<ApiResponse> {
    const rows = await db
      .select({
        content: contents,
        author_name: users.name,
      })
      .from(contents)
      .leftJoin(users, eq(contents.author_id, users.id))
      .where(eq(contents.slug, slug))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Content not found' },
      };
    }

    const content_taxonomies = await this.get_content_taxonomies(row.content.id);

    return {
      success: true,
      data: {
        ...row.content,
        author_name: row.author_name,
        taxonomies: content_taxonomies,
      },
    };
  }

  /**
   * Create new content with optional taxonomy associations.
   * Checks slug uniqueness before creation.
   */
  async create(data: CreateContentInput, author_id: string, actor?: ContentActor): Promise<ApiResponse> {
    if (data.status === 'PUBLISHED' && actor && !this.can_publish(actor)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Missing required capability: content:publish' },
      };
    }

    const [existing] = await db
      .select({ id: contents.id })
      .from(contents)
      .where(eq(contents.slug, data.slug))
      .limit(1);
    if (existing) {
      return {
        success: false,
        error: { code: 'CONFLICT', message: 'A content with this slug already exists' },
      };
    }

    const [content] = await db
      .insert(contents)
      .values({
        id: randomUUID(),
        type: data.type,
        slug: data.slug,
        title: data.title,
        status: data.status,
        meta: data.meta as Record<string, unknown>,
        author_id,
        published_at: data.published_at ? new Date(data.published_at) : null,
        password: data.password ?? null,
        is_sticky: data.is_sticky,
        format: data.format,
      })
      .returning();

    if (!content) {
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create content' },
      };
    }

    if (data.taxonomy_ids && data.taxonomy_ids.length > 0) {
      await db.insert(taxonomy_relations).values(
        data.taxonomy_ids.map((taxonomy_id) => ({
          content_id: content.id,
          taxonomy_id,
        })),
      );
    }

    return { success: true, data: content };
  }

  /**
   * Update existing content. Only provided fields are updated.
   * Replaces taxonomy associations if taxonomy_ids is provided.
   */
  async update(id: string, data: UpdateContentInput, actor?: ContentActor): Promise<ApiResponse> {
    const [existing] = await db.select().from(contents).where(eq(contents.id, id)).limit(1);
    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Content not found' },
      };
    }

    const existing_content = existing as ContentRow;

    if (actor && !this.can_edit_content(actor, existing_content.author_id)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to edit this content' },
      };
    }

    if (data.status === 'PUBLISHED' && actor && !this.can_publish(actor)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Missing required capability: content:publish' },
      };
    }

    if (data.slug && data.slug !== existing_content.slug) {
      const [slug_taken] = await db
        .select({ id: contents.id })
        .from(contents)
        .where(eq(contents.slug, data.slug))
        .limit(1);
      if (slug_taken) {
        return {
          success: false,
          error: { code: 'CONFLICT', message: 'Slug already taken' },
        };
      }
    }

    const update_data: Partial<typeof contents.$inferInsert> = {};
    if (data.slug !== undefined) update_data.slug = data.slug;
    if (data.title !== undefined) update_data.title = data.title;
    if (data.status !== undefined) update_data.status = data.status;
    if (data.meta !== undefined) update_data.meta = data.meta as Record<string, unknown>;
    if (data.published_at !== undefined)
      update_data.published_at = data.published_at ? new Date(data.published_at) : null;
    if (data.password !== undefined) update_data.password = data.password;
    if (data.is_sticky !== undefined) update_data.is_sticky = data.is_sticky;
    if (data.format !== undefined) update_data.format = data.format;

    // Snapshot pre-update state for revision history. Only when actual content fields change.
    if (Object.keys(update_data).length > 0 && this.hooks) {
      const actor_id = actor?.user_id ?? existing_content.author_id;
      const payload: ContentBeforeUpdatePayload = {
        content_id: id,
        actor_id,
        snapshot: {
          title: existing_content.title,
          slug: existing_content.slug,
          type: existing_content.type,
          status: existing_content.status,
          meta: existing_content.meta,
          published_at: existing_content.published_at,
          password: existing_content.password,
          is_sticky: existing_content.is_sticky,
          format: existing_content.format,
        },
      };
      try {
        await this.hooks.emit('content:before_update', payload);
      } catch {
        // Revision creation must not block content updates.
      }
    }

    let content: ContentRow = existing_content;
    if (Object.keys(update_data).length > 0) {
      const [updated] = await db
        .update(contents)
        .set(update_data)
        .where(eq(contents.id, id))
        .returning();
      if (updated) {
        content = updated as ContentRow;
      }
    }

    // Replace taxonomy associations if explicitly provided
    if (data.taxonomy_ids !== undefined) {
      await db.delete(taxonomy_relations).where(eq(taxonomy_relations.content_id, id));
      if (data.taxonomy_ids.length > 0) {
        await db.insert(taxonomy_relations).values(
          data.taxonomy_ids.map((taxonomy_id) => ({
            content_id: id,
            taxonomy_id,
          })),
        );
      }
    }

    return { success: true, data: content };
  }

  /** Soft delete — moves content to TRASH status instead of hard deleting. */
  async delete(id: string, actor?: ContentActor): Promise<ApiResponse> {
    const [existing] = await db
      .select({ id: contents.id, author_id: contents.author_id })
      .from(contents)
      .where(eq(contents.id, id))
      .limit(1);
    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Content not found' },
      };
    }

    if (actor && !this.can_edit_content(actor, existing.author_id)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to delete this content' },
      };
    }

    await db.update(contents).set({ status: 'TRASH' }).where(eq(contents.id, id));

    return { success: true, data: { message: 'Content moved to trash' } };
  }
}

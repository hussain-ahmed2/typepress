/**
 * GraphQL Resolvers — Type-safe resolvers for the GraphQL API.
 *
 * Security:
 * - Mutations require authentication and appropriate capabilities
 * - Public queries return only PUBLISHED content by default
 * - Non-published content access requires content read/edit capability
 * - Ownership-aware edit/delete: content:edit:any OR (content:edit:own + owner)
 * - Publish/status transitions require content:publish
 */
import { randomUUID } from 'node:crypto';
import { db, contents, menus, menu_items, taxonomies, taxonomy_relations, users } from '@typepress/db';
import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { CapabilityChecker } from '@typepress/core';
import type { Capability } from '@typepress/shared-types';
import { SearchService } from '../features/search/search.service';
import { require_actor, type GraphQLActor, type GraphQLContext } from './context';

const search_service = new SearchService();
const CONTENT_READ_CAPABILITIES: Capability[] = [
  'content:edit:any',
  'content:edit:own',
  'content:create',
  'content:publish',
];

async function can_read_non_published(context: GraphQLContext): Promise<boolean> {
  if (!context.user_id) return false;
  const [user] = await db
    .select({ capabilities: users.capabilities })
    .from(users)
    .where(eq(users.id, context.user_id))
    .limit(1);
  if (!user) return false;
  const caps = new CapabilityChecker(user.capabilities as Capability[]);
  return caps.has_any(CONTENT_READ_CAPABILITIES);
}

/** Ensure actor can publish content (status transitions to PUBLISHED). */
function require_publish_capability(actor: GraphQLActor): void {
  if (!actor.capabilities.has('content:publish')) {
    throw new GraphQLError('Missing required capability: content:publish', {
      extensions: { code: 'FORBIDDEN', http: { status: 403 } },
    });
  }
}

/**
 * Enforce ownership-aware content edit permission.
 * Allows content:edit:any, or content:edit:own when the actor owns the content.
 */
async function require_content_edit(context: GraphQLContext, content_id: string): Promise<GraphQLActor> {
  const actor = await require_actor(context);
  if (actor.capabilities.has('content:edit:any')) return actor;

  if (actor.capabilities.has('content:edit:own')) {
    const [content] = await db
      .select({ author_id: contents.author_id })
      .from(contents)
      .where(eq(contents.id, content_id))
      .limit(1);
    if (!content) {
      throw new GraphQLError('Content not found', {
        extensions: { code: 'NOT_FOUND', http: { status: 404 } },
      });
    }
    if (content.author_id === actor.user_id) return actor;
  }

  throw new GraphQLError('Missing required capability: content:edit:any or content:edit:own', {
    extensions: { code: 'FORBIDDEN', http: { status: 403 } },
  });
}

type ContentRow = typeof contents.$inferSelect;
type UserRow = typeof users.$inferSelect;
type TaxonomyRow = typeof taxonomies.$inferSelect;
type ContentTaxonomyRow = typeof taxonomy_relations.$inferSelect & { taxonomy: TaxonomyRow };

/** Content shape returned by GraphQL, matching Prisma include { author, taxonomies.taxonomy }. */
interface ContentWithRelations extends ContentRow {
  author: UserRow;
  taxonomies: ContentTaxonomyRow[];
}

/** Batch-load authors and taxonomy relations for a set of content rows. */
async function attach_content_relations(rows: ContentRow[]): Promise<ContentWithRelations[]> {
  if (rows.length === 0) return [];

  const content_ids = rows.map((r) => r.id);
  const author_ids = [...new Set(rows.map((r) => r.author_id))];

  const [author_rows, relation_rows] = await Promise.all([
    db.select().from(users).where(inArray(users.id, author_ids)),
    db
      .select({
        content_id: taxonomy_relations.content_id,
        taxonomy_id: taxonomy_relations.taxonomy_id,
        taxonomy: taxonomies,
      })
      .from(taxonomy_relations)
      .innerJoin(taxonomies, eq(taxonomy_relations.taxonomy_id, taxonomies.id))
      .where(inArray(taxonomy_relations.content_id, content_ids)),
  ]);

  const authors_by_id = new Map(author_rows.map((a) => [a.id, a]));
  const relations_by_content = new Map<string, ContentTaxonomyRow[]>();
  for (const rel of relation_rows) {
    const list = relations_by_content.get(rel.content_id) ?? [];
    list.push({
      content_id: rel.content_id,
      taxonomy_id: rel.taxonomy_id,
      taxonomy: rel.taxonomy,
    });
    relations_by_content.set(rel.content_id, list);
  }

  // Author should always exist due to FK, but guard for type safety.
  return rows.flatMap((row) => {
    const author = authors_by_id.get(row.author_id);
    if (!author) return [];
    return [
      {
        ...row,
        author,
        taxonomies: relations_by_content.get(row.id) ?? [],
      },
    ];
  });
}

/** Load a single content item with author and taxonomy relations. */
async function find_content_with_relations(where: SQL): Promise<ContentWithRelations | null> {
  const [row] = await db.select().from(contents).where(where).limit(1);
  if (!row) return null;
  const [enriched] = await attach_content_relations([row]);
  return enriched ?? null;
}

export const resolvers = {
  Query: {
    content: async (_parent: unknown, args: { id?: string; slug?: string }, context: GraphQLContext) => {
      const where_clause = args.id
        ? eq(contents.id, args.id)
        : args.slug
          ? eq(contents.slug, args.slug)
          : null;
      if (!where_clause) return null;

      const item = await find_content_with_relations(where_clause);
      if (!item) return null;

      if (item.status !== 'PUBLISHED' && !(await can_read_non_published(context))) {
        return null;
      }

      return item;
    },

    contents: async (
      _parent: unknown,
      args: { type?: string; status?: string; limit?: number; page?: number },
      context: GraphQLContext,
    ) => {
      const limit = args.limit ?? 20;
      const page = args.page ?? 1;
      const skip = (page - 1) * limit;

      const conditions: SQL[] = [];
      if (args.type) conditions.push(eq(contents.type, args.type));

      const can_read_protected = await can_read_non_published(context);
      if (args.status) {
        if (args.status !== 'PUBLISHED' && !can_read_protected) {
          throw new GraphQLError('Authentication required to query non-published content', {
            extensions: { code: 'FORBIDDEN', http: { status: 403 } },
          });
        }
        // GraphQL args are strings; ContentStatus enum values match at runtime.
        conditions.push(eq(contents.status, args.status as typeof contents.$inferSelect.status));
      } else if (!can_read_protected) {
        conditions.push(eq(contents.status, 'PUBLISHED'));
      }

      const where_clause = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, count_rows] = await Promise.all([
        db
          .select()
          .from(contents)
          .where(where_clause)
          .orderBy(desc(contents.created_at))
          .limit(limit)
          .offset(skip),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(contents)
          .where(where_clause),
      ]);

      const total = count_rows[0]?.count ?? 0;
      const items = await attach_content_relations(rows);

      return {
        items,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      };
    },

    menus: async (_parent: unknown, args: { location?: string }) => {
      const where_clause = args.location ? eq(menus.location, args.location) : undefined;
      const menu_rows = await db.select().from(menus).where(where_clause);
      if (menu_rows.length === 0) return [];

      const menu_ids = menu_rows.map((m) => m.id);
      const all_items = await db
        .select()
        .from(menu_items)
        .where(inArray(menu_items.menu_id, menu_ids))
        .orderBy(asc(menu_items.order));

      // Build nested children map for Prisma-like shape: items[].children[]
      const children_by_parent = new Map<string, Array<typeof menu_items.$inferSelect>>();
      for (const item of all_items) {
        if (!item.parent_id) continue;
        const list = children_by_parent.get(item.parent_id) ?? [];
        list.push(item);
        children_by_parent.set(item.parent_id, list);
      }

      const items_by_menu = new Map<string, Array<typeof menu_items.$inferSelect & { children: Array<typeof menu_items.$inferSelect> }>>();
      for (const item of all_items) {
        const with_children = { ...item, children: children_by_parent.get(item.id) ?? [] };
        const list = items_by_menu.get(item.menu_id) ?? [];
        list.push(with_children);
        items_by_menu.set(item.menu_id, list);
      }

      return menu_rows.map((menu) => ({
        ...menu,
        items: items_by_menu.get(menu.id) ?? [],
      }));
    },

    search: async (_parent: unknown, args: { query: string; type?: string; limit?: number }) => {
      const result = await search_service.search(args.query, args.type, 1, args.limit ?? 20);
      return result.data ?? [];
    },

    health: async () => ({
      status: 'ok',
      uptime: process.uptime(),
      plugins: [],
    }),
  },

  Mutation: {
    createContent: async (
      _parent: unknown,
      args: { input: { type: string; slug: string; title: string; status?: string; meta?: unknown } },
      context: GraphQLContext,
    ) => {
      const actor = await require_actor(context);
      if (!actor.capabilities.has('content:create')) {
        throw new GraphQLError('Missing required capability: content:create', {
          extensions: { code: 'FORBIDDEN', http: { status: 403 } },
        });
      }

      // Publishing on create requires explicit publish capability, matching REST behavior.
      if (args.input.status === 'PUBLISHED') {
        require_publish_capability(actor);
      }

      const [created] = await db
        .insert(contents)
        .values({
          id: randomUUID(),
          type: args.input.type,
          slug: args.input.slug,
          title: args.input.title,
          status: (args.input.status as typeof contents.$inferInsert.status | undefined) ?? 'DRAFT',
          meta: (args.input.meta as Record<string, unknown> | undefined) ?? {},
          author_id: actor.user_id,
        })
        .returning();

      return created;
    },

    updateContent: async (
      _parent: unknown,
      args: { id: string; input: { slug?: string; title?: string; status?: string; meta?: unknown } },
      context: GraphQLContext,
    ) => {
      const actor = await require_content_edit(context, args.id);

      // Status transitions to PUBLISHED require explicit publish capability.
      if (args.input.status === 'PUBLISHED') {
        require_publish_capability(actor);
      }

      const update_data: Partial<typeof contents.$inferInsert> = {};
      if (args.input.slug !== undefined) update_data.slug = args.input.slug;
      if (args.input.title !== undefined) update_data.title = args.input.title;
      if (args.input.status !== undefined) {
        update_data.status = args.input.status as typeof contents.$inferInsert.status;
      }
      if (args.input.meta !== undefined) {
        update_data.meta = args.input.meta as Record<string, unknown>;
      }

      const [updated] = await db
        .update(contents)
        .set(update_data)
        .where(eq(contents.id, args.id))
        .returning();

      return updated;
    },

    deleteContent: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
      await require_content_edit(context, args.id);
      await db.update(contents).set({ status: 'TRASH' }).where(eq(contents.id, args.id));
      return true;
    },
  },
};

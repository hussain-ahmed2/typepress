/**
 * Export/Import Service — Content export and import functionality.
 *
 * Security & data-integrity notes:
 * - Export/import routes must require admin-level capability (`settings:manage`).
 * - Import payloads are validated with Zod before processing.
 * - Missing content authors are remapped to the authenticated importing admin user.
 *   We intentionally do NOT auto-create placeholder users; creating users with fake or
 *   unusable passwords during import is an account-integrity risk. Mapping to the
 *   importing admin preserves attribution accountability and avoids silent account creation.
 * - Export/import actions are audit-logged via Fastify request logging at route level.
 */
import { randomUUID } from 'node:crypto';
import { db, contents, taxonomies, taxonomy_relations, users } from '@typepress/db';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { ApiResponse } from '@typepress/shared-types';

const MAX_IMPORT_ITEMS = 5000;
const MAX_STRING_LENGTH = 500;
const MAX_SLUG_LENGTH = 255;

export const import_taxonomy_schema = z.object({
  name: z.string().min(1).max(MAX_STRING_LENGTH),
  slug: z.string().min(1).max(MAX_SLUG_LENGTH),
  type: z.string().min(1).max(100),
});

export const import_content_schema = z.object({
  slug: z.string().min(1).max(MAX_SLUG_LENGTH),
  title: z.string().min(1).max(MAX_STRING_LENGTH),
  type: z.string().min(1).max(100),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'TRASH']),
  meta: z.record(z.string(), z.unknown()).optional().default({}),
  author_email: z.string().email().max(255),
});

export const import_payload_schema = z.object({
  version: z.string().min(1).max(32),
  exported_at: z.string().min(1).max(64),
  content: z.array(import_content_schema).max(MAX_IMPORT_ITEMS),
  taxonomies: z.array(import_taxonomy_schema).max(MAX_IMPORT_ITEMS),
});

export type ImportPayload = z.infer<typeof import_payload_schema>;

interface ExportData {
  version: string;
  exported_at: string;
  content: unknown[];
  taxonomies: unknown[];
}

interface ImportResult {
  content_imported: number;
  taxonomies_imported: number;
  authors_remapped: number;
  errors: string[];
}

export class ExportImportService {
  /** Build export payload for a content query result set. */
  private async build_export(
    content_rows: Array<typeof contents.$inferSelect & { author_email: string }>,
  ): Promise<ExportData> {
    const all_taxonomies = await db.select().from(taxonomies);

    const content_ids = content_rows.map((c) => c.id);
    const relations =
      content_ids.length > 0
        ? await db
            .select({
              content_id: taxonomy_relations.content_id,
              taxonomy_slug: taxonomies.slug,
            })
            .from(taxonomy_relations)
            .innerJoin(taxonomies, eq(taxonomy_relations.taxonomy_id, taxonomies.id))
            .where(inArray(taxonomy_relations.content_id, content_ids))
        : [];

    const slugs_by_content = new Map<string, string[]>();
    for (const rel of relations) {
      const list = slugs_by_content.get(rel.content_id) ?? [];
      list.push(rel.taxonomy_slug);
      slugs_by_content.set(rel.content_id, list);
    }

    return {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      content: content_rows.map((c) => ({
        ...c,
        taxonomy_slugs: slugs_by_content.get(c.id) ?? [],
      })),
      taxonomies: all_taxonomies,
    };
  }

  /**
   * Export all content and taxonomies as JSON.
   */
  async export_all(): Promise<ApiResponse<ExportData>> {
    const content_rows = await db
      .select({
        id: contents.id,
        type: contents.type,
        slug: contents.slug,
        title: contents.title,
        status: contents.status,
        meta: contents.meta,
        author_id: contents.author_id,
        created_at: contents.created_at,
        updated_at: contents.updated_at,
        published_at: contents.published_at,
        password: contents.password,
        is_sticky: contents.is_sticky,
        format: contents.format,
        author_email: users.email,
      })
      .from(contents)
      .innerJoin(users, eq(contents.author_id, users.id));

    return { success: true, data: await this.build_export(content_rows) };
  }

  /**
   * Export content of a specific type.
   */
  async export_by_type(type: string): Promise<ApiResponse<ExportData>> {
    const content_rows = await db
      .select({
        id: contents.id,
        type: contents.type,
        slug: contents.slug,
        title: contents.title,
        status: contents.status,
        meta: contents.meta,
        author_id: contents.author_id,
        created_at: contents.created_at,
        updated_at: contents.updated_at,
        published_at: contents.published_at,
        password: contents.password,
        is_sticky: contents.is_sticky,
        format: contents.format,
        author_email: users.email,
      })
      .from(contents)
      .innerJoin(users, eq(contents.author_id, users.id))
      .where(eq(contents.type, type));

    return { success: true, data: await this.build_export(content_rows) };
  }

  /**
   * Import content from a validated JSON payload.
   *
   * @param data - Zod-validated import payload.
   * @param importing_user_id - Authenticated admin performing the import. Missing
   *   content authors are remapped to this user instead of creating placeholder accounts.
   */
  async import_data(data: ImportPayload, importing_user_id: string): Promise<ApiResponse<ImportResult>> {
    const result: ImportResult = {
      content_imported: 0,
      taxonomies_imported: 0,
      authors_remapped: 0,
      errors: [],
    };

    const [importing_user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, importing_user_id))
      .limit(1);
    if (!importing_user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Importing user not found' },
      };
    }

    // Import taxonomies first
    for (const tax of data.taxonomies) {
      try {
        await db
          .insert(taxonomies)
          .values({ id: randomUUID(), name: tax.name, slug: tax.slug, type: tax.type })
          .onConflictDoUpdate({
            target: taxonomies.slug,
            set: { name: tax.name, type: tax.type },
          });
        result.taxonomies_imported++;
      } catch (error) {
        result.errors.push(`Taxonomy import error (${tax.slug}): ${String(error)}`);
      }
    }

    // Import content
    for (const item of data.content) {
      try {
        // SECURITY: Never auto-create users during import. If the referenced author does
        // not exist, remap content to the authenticated importing admin for accountability.
        const [existing_author] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, item.author_email))
          .limit(1);
        const author_id = existing_author?.id ?? importing_user_id;
        if (!existing_author) {
          result.authors_remapped++;
        }

        await db
          .insert(contents)
          .values({
            id: randomUUID(),
            slug: item.slug,
            title: item.title,
            type: item.type,
            status: item.status,
            meta: item.meta,
            author_id,
          })
          .onConflictDoUpdate({
            target: contents.slug,
            set: {
              title: item.title,
              status: item.status,
              meta: item.meta,
            },
          });
        result.content_imported++;
      } catch (error) {
        result.errors.push(`Content import error (${item.slug}): ${String(error)}`);
      }
    }

    return { success: true, data: result };
  }
}

export const export_import_service = new ExportImportService();

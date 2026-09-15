/**
 * Export/Import Service — Content export and import functionality.
 *
 * Features:
 *   - Export all content as JSON
 *   - Export specific content types
 *   - Import from JSON format
 *   - Selective import (content, taxonomies)
 */
import { prisma } from '@typepress/db';
import type { ApiResponse } from '@typepress/shared-types';

interface ExportData {
  version: string;
  exported_at: string;
  content: unknown[];
  taxonomies: unknown[];
}

interface ImportResult {
  content_imported: number;
  taxonomies_imported: number;
  errors: string[];
}

export class ExportImportService {
  /**
   * Export all content and taxonomies as JSON.
   */
  async export_all(): Promise<ApiResponse<ExportData>> {
    const [content, taxonomies] = await Promise.all([
      prisma.content.findMany({
        include: {
          author: { select: { email: true, name: true } },
          taxonomies: { include: { taxonomy: true } },
        },
      }),
      prisma.taxonomy.findMany(),
    ]);

    return {
      success: true,
      data: {
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        content: content.map((c) => ({
          ...c,
          author_email: c.author.email,
          taxonomy_slugs: c.taxonomies.map((t) => t.taxonomy.slug),
        })),
        taxonomies,
      },
    };
  }

  /**
   * Export content of a specific type.
   */
  async export_by_type(type: string): Promise<ApiResponse<ExportData>> {
    const [content, taxonomies] = await Promise.all([
      prisma.content.findMany({
        where: { type },
        include: {
          author: { select: { email: true, name: true } },
          taxonomies: { include: { taxonomy: true } },
        },
      }),
      prisma.taxonomy.findMany(),
    ]);

    return {
      success: true,
      data: {
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        content: content.map((c) => ({
          ...c,
          author_email: c.author.email,
          taxonomy_slugs: c.taxonomies.map((t) => t.taxonomy.slug),
        })),
        taxonomies,
      },
    };
  }

  /**
   * Import content from JSON data.
   */
  async import_data(data: ExportData): Promise<ApiResponse<ImportResult>> {
    const result: ImportResult = {
      content_imported: 0,
      taxonomies_imported: 0,
      errors: [],
    };

    // Import taxonomies first
    if (data.taxonomies && Array.isArray(data.taxonomies)) {
      for (const tax of data.taxonomies) {
        try {
          const t = tax as { name: string; slug: string; type: string };
          await prisma.taxonomy.upsert({
            where: { slug: t.slug },
            update: { name: t.name, type: t.type },
            create: { name: t.name, slug: t.slug, type: t.type },
          });
          result.taxonomies_imported++;
        } catch (error) {
          result.errors.push(`Taxonomy import error: ${error}`);
        }
      }
    }

    // Import content
    if (data.content && Array.isArray(data.content)) {
      for (const item of data.content) {
        try {
          const c = item as {
            slug: string;
            title: string;
            type: string;
            status: string;
            meta: unknown;
            author_email: string;
          };

          // Find or create author
          let author = await prisma.user.findUnique({ where: { email: c.author_email } });
          if (!author) {
            author = await prisma.user.create({
              data: {
                email: c.author_email,
                name: c.author_email.split('@')[0],
                password_hash: '$2b$10$placeholder',
                role: 'AUTHOR',
              },
            });
          }

          await prisma.content.upsert({
            where: { slug: c.slug },
            update: {
              title: c.title,
              status: c.status as never,
              meta: c.meta as never,
            },
            create: {
              slug: c.slug,
              title: c.title,
              type: c.type,
              status: c.status as never,
              meta: c.meta as never,
              author_id: author.id,
            },
          });
          result.content_imported++;
        } catch (error) {
          result.errors.push(`Content import error: ${error}`);
        }
      }
    }

    return { success: true, data: result };
  }
}

export const export_import_service = new ExportImportService();

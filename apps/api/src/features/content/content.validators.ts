/**
 * Content Validators — Zod schemas for content endpoint validation.
 *
 * Separate schemas for create, update, and list operations.
 * Create requires all fields; update makes everything optional.
 * List schema handles pagination, filtering, and sorting.
 */
import { z } from 'zod';

export const create_content_schema = z.object({
  type: z.string().min(1).default('post'),
  slug: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT'),
  meta: z.record(z.unknown()).optional().default({}),
  taxonomy_ids: z.array(z.string()).optional().default([]),
});

export const update_content_schema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'TRASH']).optional(),
  meta: z.record(z.unknown()).optional(),
  taxonomy_ids: z.array(z.string()).optional(),
});

export const list_content_schema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'TRASH']).optional(),
  sort: z.enum(['created_at', 'updated_at', 'title']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateContentInput = z.infer<typeof create_content_schema>;
export type UpdateContentInput = z.infer<typeof update_content_schema>;
export type ListContentQuery = z.infer<typeof list_content_schema>;

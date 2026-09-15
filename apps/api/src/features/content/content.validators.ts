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
  meta: z.record(z.string(), z.unknown()).optional().default({}),
  taxonomy_ids: z.array(z.string()).optional().default([]),
  published_at: z.string().datetime().optional(),
  password: z.string().optional(),
  is_sticky: z.boolean().optional().default(false),
  format: z.enum(['standard', 'video', 'gallery', 'quote', 'aside', 'link', 'image']).optional().default('standard'),
});

export const update_content_schema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'TRASH']).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  taxonomy_ids: z.array(z.string()).optional(),
  published_at: z.string().datetime().nullable().optional(),
  password: z.string().nullable().optional(),
  is_sticky: z.boolean().optional(),
  format: z.enum(['standard', 'video', 'gallery', 'quote', 'aside', 'link', 'image']).optional(),
});

export const list_content_schema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'TRASH']).optional(),
  sort: z.enum(['created_at', 'updated_at', 'title']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  sticky: z.coerce.boolean().optional(),
  format: z.string().optional(),
});

export type CreateContentInput = z.infer<typeof create_content_schema>;
export type UpdateContentInput = z.infer<typeof update_content_schema>;
export type ListContentQuery = z.infer<typeof list_content_schema>;

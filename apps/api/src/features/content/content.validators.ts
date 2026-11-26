/**
 * Content Validators — Zod schemas for content endpoint validation.
 *
 * Separate schemas for create, update, and list operations.
 * Create requires all fields; update makes everything optional.
 * List schema handles pagination, filtering, and sorting.
 */
import { z } from 'zod';

/** Allowed builder block types; keeps persisted/rendered blocks bounded to known renderers. */
const builder_block_type_schema = z.enum(['heading', 'text', 'image', 'button', 'divider', 'container']);

/** Builder prop values are restricted to primitives for safe persistence and rendering. */
const builder_prop_value_schema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/** Validates a single builder block from content meta. */
const builder_block_schema = z.object({
  id: z.string().min(1).max(128),
  type: builder_block_type_schema,
  props: z.record(z.string(), builder_prop_value_schema).default({}),
});

/**
 * Content meta schema. Unknown keys are preserved for extensibility, but
 * builder_data is strictly validated to prevent unsafe/unexpected payloads.
 */
const content_meta_schema = z
  .object({
    excerpt: z.string().optional(),
    featured_image: z.string().optional(),
    template: z.string().optional(),
    builder_data: z.array(builder_block_schema).max(200).optional(),
  })
  .catchall(z.unknown());

export const create_content_schema = z.object({
  type: z.string().min(1).default('post'),
  slug: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT'),
  meta: content_meta_schema.optional().default({}),
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
  meta: content_meta_schema.optional(),
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
  sort: z.enum(['created_at', 'updated_at', 'title', 'published_at']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  sticky: z.coerce.boolean().optional(),
  format: z.string().optional(),
});

export type CreateContentInput = z.infer<typeof create_content_schema>;
export type UpdateContentInput = z.infer<typeof update_content_schema>;
export type ListContentQuery = z.infer<typeof list_content_schema>;

/**
 * Taxonomy Validators — Zod schemas for taxonomy endpoint validation.
 *
 * Create requires name, slug, and type. Update makes everything optional.
 * List accepts an optional type filter.
 */
import { z } from 'zod';

export const create_taxonomy_schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  type: z.string().min(1),
  parent_id: z.string().optional(),
});

export const update_taxonomy_schema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  parent_id: z.string().nullable().optional(),
});

export const list_taxonomy_schema = z.object({
  type: z.string().optional(),
});

export type CreateTaxonomyInput = z.infer<typeof create_taxonomy_schema>;
export type UpdateTaxonomyInput = z.infer<typeof update_taxonomy_schema>;
export type ListTaxonomyQuery = z.infer<typeof list_taxonomy_schema>;

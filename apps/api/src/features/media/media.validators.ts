/**
 * Media Validators — Zod schemas for media endpoint validation.
 */
import { z } from 'zod';

export const list_media_schema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListMediaQuery = z.infer<typeof list_media_schema>;

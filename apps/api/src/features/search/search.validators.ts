import { z } from 'zod';

export const search_schema = z.object({
  q: z.string().min(1),
  type: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type SearchQuery = z.infer<typeof search_schema>;

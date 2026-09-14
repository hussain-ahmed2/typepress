import { z } from 'zod';

export const update_user_schema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER']).optional(),
  capabilities: z.array(z.string()).optional(),
});

export const list_users_schema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER']).optional(),
});

export type UpdateUserInput = z.infer<typeof update_user_schema>;
export type ListUsersQuery = z.infer<typeof list_users_schema>;

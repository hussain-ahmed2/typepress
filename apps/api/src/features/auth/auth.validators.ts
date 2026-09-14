/**
 * Auth Validators — Zod schemas for auth endpoint request validation.
 * Ensures email format and minimum password length before business logic runs.
 */
import { z } from 'zod';

export const login_schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof login_schema>;

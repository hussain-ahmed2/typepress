/**
 * Auth Validators — Zod schemas for auth endpoint request validation.
 * Ensures email format, password strength, and required fields.
 */
import { z } from 'zod';

export const login_schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const register_schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
});

export type LoginInput = z.infer<typeof login_schema>;
export type RegisterInput = z.infer<typeof register_schema>;

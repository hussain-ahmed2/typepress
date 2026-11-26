/**
 * Auth Validators — Zod schemas for auth endpoint request validation.
 * Ensures email format, password strength, and required fields.
 */
import { z } from 'zod';

/** Password policy: strong but usable (OWASP-aligned length, no whitespace). */
const password_schema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine((value) => /[A-Z]/.test(value), 'Password must contain at least one uppercase letter')
  .refine((value) => /[a-z]/.test(value), 'Password must contain at least one lowercase letter')
  .refine((value) => /[0-9]/.test(value), 'Password must contain at least one number')
  .refine((value) => !/\s/.test(value), 'Password must not contain whitespace');

export const login_schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  // Do not enforce complexity on login to avoid leaking policy and to support legacy credentials.
  password: z.string().min(1).max(128),
});

export const register_schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(100),
  password: password_schema,
});

/** Request a password reset email. Generic response prevents user enumeration. */
export const forgot_password_schema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

/** Reset password using a one-time token from email. */
export const reset_password_schema = z.object({
  token: z.string().min(1).max(256),
  password: password_schema,
});

/** Verify email address using a one-time token from email. */
export const verify_email_schema = z.object({
  token: z.string().min(1).max(256),
});

/** Request another verification email. Generic response prevents user enumeration. */
export const resend_verification_schema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export type LoginInput = z.infer<typeof login_schema>;
export type RegisterInput = z.infer<typeof register_schema>;
export type ForgotPasswordInput = z.infer<typeof forgot_password_schema>;
export type ResetPasswordInput = z.infer<typeof reset_password_schema>;
export type VerifyEmailInput = z.infer<typeof verify_email_schema>;
export type ResendVerificationInput = z.infer<typeof resend_verification_schema>;

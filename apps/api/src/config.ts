/**
 * Environment Configuration — Zod-validated environment variables.
 *
 * All required env vars are validated at startup. If any are missing,
 * the process crashes immediately with a clear error message.
 * Optional vars have sensible defaults for local development.
 */
import 'dotenv/config';
import { z } from 'zod';

const env_schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(8000),
  API_HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  SESSION_SECRET: z.string().min(32).default('dev-only-session-secret-change-in-production-32'),
  SESSION_COOKIE_NAME: z.string().default('typepress.sid'),
  SESSION_COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      return value === 'true';
    }),
  SESSION_STORE: z.enum(['redis', 'memory']).optional(),
  ADMIN_URL: z.string().default('http://localhost:6000'),
  PLUGINS_DIR: z.string().optional(),
  CSRF_PROTECTION: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      return value === 'true';
    }),
  // Storage: local filesystem (default) or S3-compatible object storage (MinIO/S3).
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('uploads'),
  STORAGE_PUBLIC_URL: z.string().default('/uploads'),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin'),
  MINIO_BUCKET: z.string().default('typepress-media'),
  MINIO_USE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  MINIO_REGION: z.string().default('us-east-1'),
  // SMTP: optional; when unset, email service falls back to safe dev logging.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      return value === 'true';
    }),
}).superRefine((env, ctx) => {
  // Fail closed for insecure defaults in production.
  if (env.NODE_ENV === 'production') {
    if (env.SESSION_SECRET === 'dev-only-session-secret-change-in-production-32') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SESSION_SECRET'],
        message: 'SESSION_SECRET must be set to a strong secret in production',
      });
    }
  }
});

const parsed_config = env_schema.parse(process.env);

export const config = {
  ...parsed_config,
  SESSION_STORE: parsed_config.SESSION_STORE ?? (parsed_config.NODE_ENV === 'production' ? 'redis' : 'memory'),
};

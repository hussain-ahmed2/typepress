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
  API_PORT: z.coerce.number().default(8000),
  API_HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  SESSION_SECRET: z.string().default('change-me-in-production'),
  ADMIN_URL: z.string().default('http://localhost:6000'),
});

export const config = env_schema.parse(process.env);

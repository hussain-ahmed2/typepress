/**
 * Database Package — Drizzle ORM client, schema, and type exports.
 *
 * Provides a singleton Drizzle db instance and re-exports schema tables/types
 * for convenient typed access across the monorepo.
 */
export { db, pool } from './client';
export type { Database } from './client';
export * from './schema';

// Temporary compatibility alias during Prisma -> Drizzle migration.
// Prefer importing `db` in new/updated code.
export { db as prisma } from './client';

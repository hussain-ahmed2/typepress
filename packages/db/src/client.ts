/**
 * Drizzle database client — singleton PostgreSQL connection.
 *
 * Uses node-postgres Pool with Drizzle ORM for type-safe queries.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

const global_for_db = globalThis as unknown as {
  db_pool: Pool | undefined;
};

const connection_string = process.env.DATABASE_URL ?? 'postgresql://typepress:typepress_dev@localhost:5432/typepress';

export const pool =
  global_for_db.db_pool ??
  new Pool({
    connectionString: connection_string,
  });

if (process.env.NODE_ENV !== 'production') {
  global_for_db.db_pool = pool;
}

export const db = drizzle(pool, { schema });
export type Database = typeof db;

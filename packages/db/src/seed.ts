/**
 * Database seed — creates initial admin user for local development.
 */
import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { db, pool } from './client';
import { users } from './schema';

async function seed(): Promise<void> {
  console.log('Seeding database...');

  const email = 'admin@typepress.dev';
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (!existing) {
    await db.insert(users).values({
      id: randomUUID(),
      email,
      name: 'Admin',
      password_hash: '$2b$10$placeholder_hash_replace_me',
      role: 'ADMIN',
      capabilities: ['content:create', 'content:edit:any', 'content:publish', 'media:upload', 'media:delete', 'users:manage', 'plugins:install', 'settings:manage'],
      email_verified: true,
      email_verified_at: new Date(),
    });
    console.log(`Created admin user: ${email}`);
  } else {
    console.log(`Admin user already exists: ${email}`);
  }

  console.log('Seed complete.');
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });

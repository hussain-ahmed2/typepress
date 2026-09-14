import { prisma } from './client';

async function seed() {
  console.log('Seeding database...');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@typepress.dev' },
    update: {},
    create: {
      email: 'admin@typepress.dev',
      name: 'Admin',
      password_hash: '$2b$10$placeholder_hash_replace_me',
      role: 'ADMIN',
      capabilities: ['content:create', 'content:edit:any', 'content:publish', 'media:upload', 'media:delete', 'users:manage', 'plugins:install', 'settings:manage'],
    },
  });

  console.log(`Created admin user: ${admin.email}`);
  console.log('Seed complete.');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

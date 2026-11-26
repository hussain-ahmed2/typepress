import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const admin_src = resolve(import.meta.dirname, 'apps/admin/src');

export default defineConfig({
  resolve: {
    alias: {
      '@': admin_src,
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts', 'apps/api/src/**/*.test.ts', 'apps/admin/src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts', 'apps/api/src/**/*.ts'],
      exclude: ['**/node_modules/**', '**/*.test.ts'],
    },
  },
});

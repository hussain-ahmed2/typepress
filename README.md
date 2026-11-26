# Typepress

A TypeScript-native CMS designed to surpass WordPress.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start infrastructure (Postgres, Redis, MinIO)
pnpm docker:up

# Set up database
cp .env.example .env
pnpm db:generate
pnpm db:migrate

# Start all apps
pnpm dev
```

## Apps

| App | Port | Description |
|---|---|---|
| API | 8000 | Fastify REST API |
| Admin | 6000 | Next.js admin panel |
| Renderer | 6001 | Next.js public site |

## Infrastructure

| Service | Port | Description |
|---|---|---|
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Cache + sessions |
| MinIO API | 9000 | S3-compatible object storage |
| MinIO Console | 9001 | MinIO admin UI |

## Development

```bash
pnpm dev          # Start all apps
pnpm build        # Build all apps
pnpm lint         # Lint all apps
pnpm format       # Format with Prettier
pnpm test:run     # Run unit/integration tests (CI-safe default; env-gated e2e skipped)
pnpm test:ci      # Verification gate: lint + build + test:run
pnpm test:e2e     # Run localhost-dependent API e2e tests (requires running API on :8000)
```

### E2E Tests

`apps/api/src/__tests__/admin_e2e.test.ts` and `builder_e2e.test.ts` require a running API server.
They are skipped by default so `pnpm test:run` is reliable in clean/CI environments.

```bash
# Start API first, then:
pnpm test:e2e

# Or point at a custom API base URL (implies e2e enabled):
E2E_API_BASE=http://localhost:8000 pnpm vitest run apps/api/src/__tests__/admin_e2e.test.ts
```

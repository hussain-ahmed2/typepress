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
```

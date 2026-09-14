# Typepress — Master Plan

## Overview
Typepress is a TypeScript-native CMS designed to surpass WordPress. Built with Fastify, Next.js, Prisma, and a feature-based architecture that makes extending the system as simple as creating a new directory.

## WordPress Targets
| WordPress Weakness | Typepress Advantage |
|---|---|
| PHP, no static typing | Full TypeScript, typed hook system, typed plugin SDK |
| Global function namespace | Proper module system, typed events, no global pollution |
| MySQL-only, rigid schema | Prisma + Postgres JSONB, real query-ability on meta |
| jQuery-era admin UI | Next.js admin, optimistic UI, React Query caching |
| Plugins run with full trust | Capability-scoped plugin permissions, opt-in API access |
| No real-time collaboration | Socket.IO-powered live editing, presence, comments |
| REST API bolted on later | API-first from day one — admin UI is just an API consumer |
| PHP template files | React Server Components as the theme layer |
| Shared PHP hosting | Stateless API, Redis-backed sessions/cache, container-native |

## Tech Stack
- **API**: Fastify 5 (TypeScript)
- **Admin**: Next.js 15 (App Router, Tailwind v4)
- **Renderer**: Next.js 15 (SSR/ISR)
- **Database**: PostgreSQL 16 via Prisma
- **Cache**: Redis 7
- **Monorepo**: Turborepo + pnpm
- **Testing**: Vitest
- **Constraint**: Free/open-source only, no paid SaaS dependencies

## Architecture
Feature-based architecture where each feature (auth, content, media, taxonomy) is self-contained with its own routes, service, validators, and types. Features register via a `FeaturePlugin` contract in `@typepress/core`.

## Monorepo Structure
```
typepress/
  apps/api            Fastify REST API (port 8000)
  apps/admin          Next.js admin panel (port 6000)
  apps/renderer       Next.js public site (port 6001)
  packages/core       HookRegistry, CapabilityChecker, PluginManager, FeatureRegistry
  packages/db         Prisma schema + PostgreSQL
  packages/shared_types   Type definitions
  packages/plugin_sdk     Plugin author SDK
  packages/theme_sdk      Theme author SDK
  plugins/            First-party plugins
  themes/             First-party themes
  docker/             Infrastructure config
  .plans/             Project plans and execution logs
```

## Phases
| Phase | Status | Description |
|---|---|---|
| Phase 0 | COMPLETED | Monorepo, Docker, Prisma, core packages |
| Phase 1 | IN PROGRESS | MVP CMS (auth, content, media, taxonomy, admin, renderer) |
| Phase 2 | PLANNED | Extensibility (plugin SDK, theme SDK) |
| Phase 2.5 | PLANNED | Visual drag-and-drop builder (Craft.js) |
| Phase 3 | PLANNED | WordPress feature parity |
| Phase 4 | PLANNED | Differentiators (real-time, GraphQL, ISR) |
| Phase 5 | PLANNED | Launch hardening |

## Constraints
- Solo, part-time pace
- Free/open-source stack only
- Launch after Phase 2.5/early Phase 3 with narrower feature set

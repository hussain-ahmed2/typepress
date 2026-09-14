# Typepress — Coding Instructions

## Project Overview
Typepress is a TypeScript-native CMS built to surpass WordPress. This document defines the coding conventions, architectural patterns, and reference points for all contributors (human and AI).

---

## Core Principles

### 1. OOP First
- Use **classes** for stateful systems (HookRegistry, PluginManager, CapabilityChecker)
- Use **interfaces** to define contracts between modules
- Favor **composition over inheritance** — inject dependencies via constructors
- Keep classes focused — single responsibility

### 2. TypeScript Strict Mode
- `strict: true` everywhere — no exceptions
- No `any` — use `unknown` and narrow with type guards
- Prefer `readonly` for immutability where it makes sense
- Use `as const` for literal types when appropriate

### 3. Type Safety Across Boundaries
- All types shared between apps live in `packages/shared-types`
- API request/response types are defined once, used by both server and client
- Plugin/theme SDKs re-export relevant types from shared-types

---

## Architecture Patterns

### Monorepo Layout
```
typepress/
  apps/          → Runnable applications (api, admin, renderer)
  packages/      → Shared libraries (core, db, shared-types, plugin-sdk, theme-sdk)
  plugins/       → First-party plugin packages
  themes/        → First-party theme packages
  docker/        → Infrastructure config
```

### Dependency Flow
```
apps/* → packages/* (never the reverse)
packages/shared-types → no dependencies (leaf node)
packages/core → packages/shared-types
packages/db → @prisma/client
packages/plugin-sdk → packages/core, packages/shared-types
packages/theme-sdk → packages/shared-types
```

**Rule:** Apps depend on packages. Packages never depend on apps.

### Workspace Protocol
All internal dependencies use `workspace:*` in package.json:
```json
{
  "dependencies": {
    "@typepress/core": "workspace:*"
  }
}
```

---

## Code Style

### Formatting
- **Prettier**: semi, singleQuote, trailingComma: all, printWidth: 100
- **ESLint**: flat config with typescript-eslint + prettier

### Naming Conventions
| Element | Convention | Example |
|---|---|---|
| Classes | PascalCase | `HookRegistry`, `PluginManager` |
| Interfaces | PascalCase | `Plugin`, `ThemeSlotProps` |
| Enums/Types | PascalCase | `ContentStatus`, `UserRole` |
| Functions | snake_case | `has_capability`, `load_plugin` |
| Variables | snake_case | `loaded_plugins`, `next_id` |
| Files | snake_case | `plugin_loader.ts`, `shared_types/` |
| Packages | kebab-case, scoped | `@typepress/core` |
| Constants | UPPER_SNAKE_CASE | `API_PORT` |

> **Note:** Package directory names stay kebab-case (`shared-types`) because npm/pnpm requires it, but files inside use snake_case.

### File Structure
- One primary export per file (class or module)
- Barrel exports via `index.ts`
- Keep files under 200 lines — split if longer

---

## Database (Prisma)

### Schema Conventions
- Use `cuid()` for primary keys (URL-safe, sortable)
- Use `@default(now())` for timestamps
- Use `@updatedAt` for updated fields
- JSONB columns for flexible/meta data (Content.meta, User.capabilities)
- Index foreign keys and frequently queried fields
- Use enums for fixed values (UserRole, ContentStatus)

### Migration Rules
- Never edit a generated migration — create a new one
- Name migrations descriptively: `add_seo_fields`, `create_media_table`
- Test migrations roll back cleanly before committing

---

## API (Fastify)

### Route Structure
```
apps/api/src/routes/
  health.ts      → GET /health
  content.ts     → GET/POST/PUT/DELETE /api/content
  auth.ts        → POST /api/auth/login, /logout, GET /api/auth/me
```

### Response Format
All API responses follow a consistent shape:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```

### Error Handling
- Use Fastify's `setErrorHandler` for global error handling
- Validate request bodies with Zod before processing
- Return proper HTTP status codes (400, 401, 403, 404, 500)

---

## Plugin System

### Plugin Contract
Every plugin must implement:
```typescript
interface Plugin {
  name: string;
  version: string;
  requiredCapabilities?: Capability[];
  register: (core: PluginAPI) => void | Promise<void>;
}
```

### What Plugins Can Do
- Register hooks (actions and filters)
- Register new content types (via Zod schema)
- Register new API routes
- Register new admin UI components

### What Plugins Cannot Do
- Access the database directly (go through the API)
- Modify other plugins' behavior
- Bypass capability checks

---

## Testing

### Strategy
- Unit tests for packages (hooks, capabilities, plugin loader)
- Integration tests for API routes
- E2E tests for critical flows (login, create post, publish)

### Tools
- **Vitest** for unit/integration tests
- **Playwright** for E2E tests (when UI stabilizes)

### Test File Location
- Co-located with source: `src/__tests__/hooks.test.ts`
- Or in a top-level `__tests__/` directory per package

---

## Git Workflow

### Branch Strategy
- `main` — production-ready code
- `develop` — integration branch
- `feature/*` — new features
- `fix/*` — bug fixes

### Commit Messages
```
type(scope): description

Examples:
feat(hooks): add async hook support
fix(db): correct taxonomy cascade delete
refactor(core): convert PluginManager to class
```

### PR Requirements
- All checks pass (build, lint, tests)
- At least one review (or self-review for solo work)
- No `any` types introduced
- No console.log in production code

---

## Performance Rules

- Lazy-load heavy modules (Prisma client, Sharp, etc.)
- Use connection pooling for database
- Cache expensive queries with Redis
- Paginate all list endpoints (default: 20 items)
- Use `select` in Prisma to avoid fetching unused columns

---

## Security Rules

- Never commit `.env` files
- Hash passwords with bcrypt (cost factor >= 12)
- Validate all user input with Zod
- Use parameterized queries (Prisma handles this)
- Set CORS origins explicitly, never `*` in production
- Rate-limit auth endpoints

---

## File Reference

| File | Purpose |
|---|---|
| `PLAN.md` | Master plan with phased roadmap |
| `AGENTS.md` | This file — coding instructions |
| `.env.example` | Environment variable template |
| `docker/docker-compose.yml` | Infrastructure services |
| `packages/db/prisma/schema.prisma` | Database schema |
| `turbo.json` | Build pipeline config |
| `tsconfig.base.json` | Shared TypeScript config |

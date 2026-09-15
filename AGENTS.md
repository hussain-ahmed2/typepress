# Typepress — Coding Instructions

## Project Overview
Typepress is a TypeScript-native CMS built to surpass WordPress. This document defines the coding conventions, architectural patterns, and reference points for all contributors (human and AI).

---

## ⚠️ CRITICAL RULES (Must Follow)

### 1. NEVER Commit Without Verifying
```bash
# BEFORE committing, ALWAYS:
pnpm build          # Verify compilation
pnpm test:run       # Verify tests pass
# THEN commit
```

### 2. NEVER Run Servers Without Permission
```bash
# DO NOT start Docker, API, Admin, or Renderer unless explicitly asked
# The user manages their own dev environment
```

### 3. ALWAYS Test Before Pushing
```bash
# BEFORE pushing, ALWAYS:
pnpm build          # All 12 packages compile
pnpm test:run       # All 82 tests pass
# THEN push
```

### 4. ALWAYS Apply Theme Consistently
- Use colors: #2185d5 (blue), #3a4750 (gray), #303841 (dark), #f3f3f3 (light)
- Use drop-shadow, not shadow
- Use rounded-md, not rounded-lg
- Apply to ALL components, not just sidebar

### 5. ALWAYS Verify Visual Changes
- Start the server
- Open browser
- Check the UI matches the design
- THEN commit

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
  .plans/        → Project plans and execution logs
```

### Dependency Flow
```
apps/* → packages/* (never the reverse)
packages/shared-types → no dependencies (leaf node)
packages/core → packages/shared-types, fastify
packages/db → @prisma/client
packages/plugin-sdk → packages/core, packages/shared-types
packages/theme-sdk → packages/shared-types, react
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

## Feature-Based Architecture

### Core Concept
Each feature (auth, content, media, taxonomy) is a **self-contained module** with its own routes, service, validators, and types. Features register via a `FeaturePlugin` contract in `@typepress/core`.

### Feature Directory Structure
```
apps/api/src/features/
  auth/
    index.ts              # FeaturePlugin export
    auth.routes.ts        # HTTP handlers
    auth.service.ts       # Business logic (OOP class)
    auth.validators.ts    # Zod schemas
    auth.types.ts         # Feature-internal types
  content/
    index.ts
    content.routes.ts
    content.service.ts
    content.validators.ts
  media/
    index.ts
    media.routes.ts
    media.service.ts
    media.validators.ts
  taxonomy/
    index.ts
    taxonomy.routes.ts
    taxonomy.service.ts
    taxonomy.validators.ts
  index.ts                # Feature registry — imports + registers all features
```

### Adding a New Feature
1. Create directory under `apps/api/src/features/your_feature/`
2. Implement `FeaturePlugin` interface (name, version, register)
3. Create routes, service, validators following existing patterns
4. Import and register in `apps/api/src/features/index.ts`

**That's it — no existing code needs modification.**

### Feature Contract
```typescript
interface FeaturePlugin {
  name: string;           // Used as route prefix: /api/{name}
  version: string;
  dependencies?: string[]; // Features that must load first
  register: (app: FastifyInstance, context: FeatureContext) => void | Promise<void>;
}

interface FeatureContext {
  hooks: HookRegistry;    // Access to the hook system
}
```

### Dependency Rules
```
Features CAN import from:
  @typepress/core        (hooks, capabilities, feature contracts)
  @typepress/db          (Prisma client)
  @typepress/shared-types (type definitions)
  ../../infrastructure/  (shared middleware)

Features MUST NOT import from other features.
Cross-feature communication happens exclusively through the hook system.
```

### Infrastructure Layer
```
apps/api/src/infrastructure/
  middleware/
    validation.middleware.ts   # Zod body/query/params validation
    auth.middleware.ts         # require_auth, require_capability
    index.ts                  # Barrel exports
  error_handler.ts            # Global Fastify error handler
  hooks_integration.ts        # Wires HookRegistry into Fastify lifecycle
  index.ts                    # Barrel exports
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
- Every file starts with a JSDoc comment explaining its purpose

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

### Response Format
All API responses follow a consistent shape:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### Validation
- Validate all inputs with Zod schemas before processing
- Use `validate_body`, `validate_query`, `validate_params` middleware
- Return structured 400 errors with field-level details

### Error Handling
- Global error handler catches all unhandled errors
- Zod errors → 400, Not found → 404, Default → 500
- Production mode sanitizes error messages

---

## Plugin System

### Plugin Contract
Every plugin must implement:
```typescript
interface Plugin {
  name: string;
  version: string;
  required_capabilities?: Capability[];
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
- Modify other plugins' behavior directly (use hooks)
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
| `.plans/00-master-plan.md` | Master plan with phased roadmap |
| `AGENTS.md` | This file — coding instructions |
| `.env.example` | Environment variable template |
| `docker/docker-compose.yml` | Infrastructure services |
| `packages/db/prisma/schema.prisma` | Database schema |
| `turbo.json` | Build pipeline config |
| `tsconfig.base.json` | Shared TypeScript config |
| `vitest.config.ts` | Test configuration |

# Phase 1 — MVP CMS (IN PROGRESS)

## Goal
Build a working blog CMS with content management, auth, media, taxonomies, and a public renderer.

## Architecture Decision: Feature-Based
Each feature is self-contained with routes, service, validators, and types. Features register via `FeaturePlugin` contract. Adding a new feature = create directory + one import line.

## Steps Executed

### Step 1: Feature Contract in Core
- Created `packages/core/src/feature.ts` with `FeaturePlugin` interface and `FeatureRegistry` class
- Updated `packages/core/src/index.ts` to export feature types
- Updated `packages/plugin_sdk/src/index.ts` to re-export feature types

### Step 2: Infrastructure Layer
- Created `apps/api/src/infrastructure/middleware/validation.middleware.ts` — Zod body/query/params validation
- Created `apps/api/src/infrastructure/middleware/auth.middleware.ts` — session auth guard + capability check
- Created `apps/api/src/infrastructure/error_handler.ts` — global Fastify error handler
- Created `apps/api/src/infrastructure/hooks_integration.ts` — wires HookRegistry into Fastify lifecycle
- Created `apps/api/src/infrastructure/index.ts` — barrel exports

### Step 3: Auth Feature
- `apps/api/src/features/auth/auth.validators.ts` — Zod login schema
- `apps/api/src/features/auth/auth.service.ts` — AuthService class (login, get_current_user)
- `apps/api/src/features/auth/auth.routes.ts` — POST /login, POST /logout, GET /me
- `apps/api/src/features/auth/index.ts` — FeaturePlugin export

### Step 4: Content Feature
- `apps/api/src/features/content/content.validators.ts` — Zod schemas for create/update/list
- `apps/api/src/features/content/content.service.ts` — ContentService class (list, get_by_id, get_by_slug, create, update, delete)
- `apps/api/src/features/content/content.routes.ts` — Full CRUD with validation + auth
- `apps/api/src/features/content/index.ts` — FeaturePlugin export

### Step 5: Media Feature
- `apps/api/src/features/media/media.validators.ts` — Zod list schema
- `apps/api/src/features/media/media.service.ts` — MediaService class (list, create, delete)
- `apps/api/src/features/media/media.routes.ts` — GET /, POST /upload, DELETE /:id
- `apps/api/src/features/media/index.ts` — FeaturePlugin export

### Step 6: Taxonomy Feature
- `apps/api/src/features/taxonomy/taxonomy.validators.ts` — Zod schemas for create/update/list
- `apps/api/src/features/taxonomy/taxonomy.service.ts` — TaxonomyService class (list, get_by_id, create, update, delete)
- `apps/api/src/features/taxonomy/taxonomy.routes.ts` — Full CRUD with validation + auth
- `apps/api/src/features/taxonomy/index.ts` — FeaturePlugin export

### Step 7: Feature Registry + Server Refactor
- Created `apps/api/src/features/index.ts` — imports and registers all features
- Updated `apps/api/src/server.ts` — uses feature registry instead of manual route imports
- Deleted old `apps/api/src/routes/` directory

### Step 8: Admin App (Pending)
- Login page
- Dashboard with content list
- Content editor with Tiptap
- Media library grid
- Taxonomy management

### Step 9: Renderer App (Pending)
- Dynamic `[slug]` route for pages/posts
- ISR/SSR content fetching
- Default theme

### Step 10: Tests (Pending)
- Service unit tests
- API integration tests

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/login | No | Login with email/password |
| POST | /api/auth/logout | No | Clear session |
| GET | /api/auth/me | Yes | Get current user |

### Content
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/content | No | List with pagination |
| GET | /api/content/:id | No | Get by ID |
| GET | /api/content/slug/:slug | No | Get by slug |
| POST | /api/content | Yes | Create content |
| PUT | /api/content/:id | Yes | Update content |
| DELETE | /api/content/:id | Yes | Move to trash |

### Media
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/media | No | List uploads |
| POST | /api/media/upload | Yes | Upload file |
| DELETE | /api/media/:id | Yes | Delete media |

### Taxonomy
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/taxonomy | No | List by type |
| GET | /api/taxonomy/:id | No | Get by ID |
| POST | /api/taxonomy | Yes | Create taxonomy |
| PUT | /api/taxonomy/:id | Yes | Update taxonomy |
| DELETE | /api/taxonomy/:id | Yes | Delete taxonomy |

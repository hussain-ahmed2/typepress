# Typepress Execution Progress Log

> Last updated: 2026-11-26  
> Rule: Update this file after each meaningful work block. Include status, files touched, verification, and next steps.

## Status Legend
- `TODO` - not started
- `IN_PROGRESS` - actively being worked
- `BLOCKED` - waiting on dependency/decision
- `DONE` - completed and verified
- `PARTIAL` - implemented but missing tests/docs/follow-up

## Current Sprint: Phase 0 Stabilize & Secure Foundation

| ID | Task | Priority | Status | Owner | Notes | Verification |
|---|---|---:|---|---|---|---|
| P0-PLAN | Create master plan + progress log | P0 | DONE | main agent | Created `.plans/00-master-plan.md` and `.plans/progress.md` | Files created |
| P0-AUTH-BRIDGE | Fix session->request.user_id bridge; harden auth middleware/session behavior | P0 | PARTIAL | subagent:auth-bridge | Added `attach_session_user` preHandler bridge, config-driven secure/sameSite/cookie name, session regenerate on login/register, safer logout clear; added middleware unit tests | Targeted tests pass; build passes |
| P0-SEARCH-SQLI | Fix search SQL interpolation vulnerability | P0 | DONE | subagent:search-sqli + main fix | Parameterized raw query via `Prisma.sql`/`$queryRaw`; added `search.service.test.ts`; exported `Prisma` from `@typepress/db`; fixed test hoisting/TS issues | `pnpm vitest run apps/api/src/features/search/search.service.test.ts` passes; build passes |
| P0-GRAPHQL-AUTHZ | Add GraphQL auth context and resolver authorization | P0 | PARTIAL | subagent:graphql-authz | Added per-request GraphQL context, auth/capability checks on mutations, removed `author_id: 'system'`, tightened non-published query exposure, disabled introspection/landing in prod; added resolver authz tests | Targeted tests pass; build passes |
| P0-EXPORT-IMPORT | Harden export/import with capability checks and safer import | P0 | PARTIAL | subagent:export-import | Required `settings:manage`, added strict Zod import validation, removed placeholder-password user creation (remap missing authors to importing admin), added audit logs and targeted tests | Targeted tests pass; build passes |
| P0-SOCKET-AUTH | Authenticate/authorize Socket.IO connections and rooms | P0 | PARTIAL | subagent:socket-auth | Added session-cookie auth middleware, fail-closed connection auth, room join/content-change authorization, server-bound identity, room-scoped presence; added socket auth tests | Targeted tests pass; build passes |
| P0-RBAC-AUDIT | Add capability checks to write endpoints missing them | P0 | PARTIAL | subagent:rbac-audit | Added `require_capability` to content/media/taxonomy/menu/revision writes; preserved public reads; added `apps/api/src/features/rbac.routes.test.ts` | Targeted tests pass; build passes |
| P0-CSRF | Add CSRF protection for cookie-auth state changes | P0 | PARTIAL | subagent:csrf-hardening + main agent | Added dedicated CSRF tests, optional origin/referer checks (`CSRF_ORIGIN_CHECK`, `CSRF_TRUSTED_ORIGINS`), explicit exemptions; GraphQL POST covered | Targeted tests pass; build passes |
| P0-RBAC-OWNERSHIP | Ownership-aware RBAC and capability model cleanup | P0 | PARTIAL | subagent:rbac-ownership | Added `taxonomy:manage`/`menu:manage`, `require_any_capability`, ownership-aware content/revision checks, publish enforcement on actor-aware create/update; legacy cap fallbacks kept | Targeted tests pass; build passes |
| P0-REDIS-SESSION | Production session store (Redis/DB-backed) | P0 | PARTIAL | subagent:redis-session | Added Redis-backed session store with `SESSION_STORE=redis|memory`, startup ping/fail-fast in redis mode, onClose quit, memory fallback for dev/test | Targeted tests pass; build passes |
| P0-GRAPHQL-HARDENING | Align GraphQL RBAC/ownership + abuse limits | P0 | PARTIAL | subagent:graphql-hardening | Aligned ownership-aware create/update/delete/publish checks; added depth/complexity limits and tests | Targeted tests pass; build passes |
| P0-SOCKET-HARDENING | Align Socket.IO RBAC + payload/rate limits | P0 | PARTIAL | subagent:socket-hardening | Aligned ownership-aware edit checks; added payload validation and per-socket rate limits with realtime error codes and tests | Targeted tests pass; build passes |
| P0-CI-GATE | CI/verification gate hygiene | P0 | DONE | subagent:ci-gate + main agent | Localhost e2e gated behind `RUN_E2E`/`E2E_API_BASE`; added `test:e2e`/`test:ci`/`typecheck`; fixed pre-existing core lint error | `pnpm build` ✅, `pnpm test:run` ✅ (e2e skipped by default), `pnpm lint` ✅ |
| P0-TESTS | Add security regression tests / verification gate | P0 | DONE | main agent | Full verification gate green after batch 4 reconciliation | `pnpm build` ✅ 33/33, `pnpm test:run` ✅ 17 passed/2 skipped (160/21), `pnpm lint` ✅ 13/13 |
| P1-ADMIN-AUTH-GUARD | Admin auth guard/bootstrap/logout | P1 | PARTIAL | subagent:admin-auth-guard | Added `AuthGuard` bootstrap via `/api/auth/me`, no-flash dashboard protection, logout thunk/UI, auth status in user slice; targeted tests added | Targeted tests pass; build/lint pass |
| P1-SETTINGS-SYSTEM | Settings DB/API/admin wiring | P1 | PARTIAL | subagent:settings-system | Added `Setting` Prisma model, settings shared types, `features/settings` GET/PUT (`settings:manage`), registered feature, wired admin settings page to real API | `db:generate` ✅; targeted tests pass; migration SQL/file still pending in env; build/test/lint pass |
| P1-MEDIA-PIPELINE | Real media upload/storage pipeline | P1 | PARTIAL | subagent:media-pipeline | Multipart upload with validation, local/S3(MinIO) storage adapters, Sharp normalization, storage-backed delete, `Media.storage_key` schema+migration SQL, docker MinIO service | Targeted tests pass; build/test/lint pass; DB migration not applied |
| P1-COMMENTS | Comments/moderation system | P1 | PARTIAL | subagent:comments-system | Added Comment model/migration SQL, shared types/capability, `features/comments` API (public create + moderator moderation/delete), admin comments page/sidebar nav | Targeted tests pass; build/test/lint pass; migration not applied |
| P1-REVISIONS-LIFECYCLE | Revision lifecycle integration | P1 | PARTIAL | subagent:revisions-lifecycle | Auto-create revision snapshots on content updates via hook, full-snapshot restore with publish-cap/slug-conflict guards and pre-restore snapshot | Targeted tests pass; build/test/lint pass |
| P1-ADMIN-UX | Admin UX cleanup and real dashboard | P1 | PARTIAL | subagent:admin-ux | Real dashboard stats, fixed admin lint `any`, marketplace labeled catalog preview, emoji/style cleanup in touched files | Build/test/lint pass |

## Work Log

### 2026-11-26 — Initial audit and planning
- **Action**: Explored codebase/docs and ran 3 parallel audits (admin/renderer, API/core/security, docs/competitor gaps).
- **Findings**: Confirmed critical P0 issues: auth bridge missing, plugin loader non-executing, GraphQL unauth, search SQL interpolation, media placeholder, export/import weak controls, Socket.IO unauth, thin tests, major docs drift.
- **Artifacts**: `.plans/00-master-plan.md`, `.plans/progress.md`.

### 2026-11-26 — Phase 0 batch 1 (parallel agents)
- **Tracks**: auth bridge/session middleware, search SQL parameterization, GraphQL authZ.
- **Result**: Code landed for all three; tests added but initially not run due missing deps.

### 2026-11-26 — Phase 0 batch 2 (parallel agents)
- **Tracks**: export/import hardening, Socket.IO auth, RBAC audit on write endpoints.
- **Result**: Code and targeted tests landed for all three.

### 2026-11-26 — Verification/fix pass
- **Action**: Installed deps (`pnpm install`), generated Prisma client (`pnpm db:generate`), fixed search test hoisting/TS issues, fixed TS build errors in graphql test and socket service, ran targeted tests and full build/tests.
- **Verification**:
  - `pnpm build` ✅ (33/33 tasks successful)
  - Targeted P0 tests ✅ (`auth.middleware`, `search.service`, `graphql/resolvers`, `export_import`, `realtime/socket`, `rbac.routes` all pass)
  - `pnpm test:run` ⚠️ 14 passed / 2 failed (pre-existing env-dependent: `apps/api/src/__tests__/admin_e2e.test.ts`, `apps/api/src/__tests__/builder_e2e.test.ts` require localhost:8000), 108 passed / 21 skipped

### 2026-11-26 — P0 CSRF baseline
- **Action**: Added session-bound CSRF token middleware (`apps/api/src/infrastructure/middleware/csrf.middleware.ts`), exported/wired globally in server, added `GET /api/auth/csrf`, included `csrf_token` in auth login/register responses/session type, updated admin API client to fetch/attach/retry CSRF token (`apps/admin/src/lib/api_client.ts`).
- **Behavior**: Mutating requests require `x-csrf-token` matching session token; safe methods and auth login/register/logout/csrf endpoints exempt; disabled by default in `NODE_ENV=test` unless `CSRF_PROTECTION=true`.
- **Verification**: `pnpm build` passes; full test suite unchanged except known env-dependent e2e failures.
- **Next**: Add dedicated CSRF tests, decide policy for GraphQL/browser clients, ensure all non-browser clients send token, document CSRF flow.

### 2026-11-26 — Skill addition
- **Action**: Added `personalized-ui-ux-design` skill globally at `~/.agents/skills/personalized-ui-ux-design/SKILL.md` and localized to repo at `.agents/skills/personalized-ui-ux-design/SKILL.md`.

### 2026-11-26 — Phase 0 batch 3 (parallel agents + reconciliation)
- **Tracks**: CSRF hardening, ownership-aware RBAC/capability cleanup, Redis session store.
- **CSRF**: Added `apps/api/src/infrastructure/middleware/csrf.middleware.test.ts`; hardened origin/referer policy via env (`CSRF_ORIGIN_CHECK`, `CSRF_TRUSTED_ORIGINS`); GraphQL POST covered.
- **RBAC ownership**: Added `taxonomy:manage`/`menu:manage` in shared types; added `require_any_capability`; enforced content edit/delete/restore ownership (`content:edit:any` OR `content:edit:own`+owner); enforced `content:publish` on actor-aware create/update; legacy capability fallbacks preserved.
- **Redis session store**: Added `apps/api/src/infrastructure/session_store.ts` + tests; `SESSION_STORE=redis|memory` in config; server wiring with startup ping/fail-fast and onClose quit; `.env.example` updated.
- **Reconciliation/fixes**: Removed `any` usage in touched files (socket test, session store test, rbac test, server sessionStore decoration, admin api client), added FastifyInstance `sessionStore` augmentation, fixed rbac test side-effect import regression.
- **Verification**:
  - `pnpm build` ✅ (33/33 tasks successful)
  - `pnpm test:run` ⚠️ 16 passed / 2 failed (known env-dependent e2e: `admin_e2e.test.ts`, `builder_e2e.test.ts`), 140 passed / 21 skipped

### 2026-11-26 — Phase 0 batch 4 (parallel agents + reconciliation)
- **Tracks**: GraphQL hardening, Socket.IO hardening, CI/verification gate hygiene.
- **GraphQL**: Aligned ownership-aware create/update/delete/publish RBAC; added depth/complexity limits and tests (`apps/api/src/graphql/limits.ts`, `limits.test.ts`).
- **Socket.IO**: Added payload validation and per-socket in-memory rate limits for `join:editing`/`cursor:move`/`content:change`; explicit `error:realtime` codes; tests updated.
- **CI gate**: E2e localhost tests gated behind `RUN_E2E`/`E2E_API_BASE`; added `test:e2e`, `test:ci`, `typecheck` scripts; README updated; fixed pre-existing core lint unused-var.
- **Verification**:
  - `pnpm build` ✅ (33/33 tasks successful)
  - `pnpm test:run` ✅ (17 passed / 2 skipped, 160 passed / 21 skipped; e2e opt-in by default)
  - `pnpm lint` ✅ (13/13 tasks successful; warnings only)

### 2026-11-26 — Phase 1 batch 1 (parallel agents + reconciliation)
- **Tracks**: Admin auth guard/bootstrap, settings system, real media upload/storage pipeline.
- **Admin auth**: Added `AuthGuard`, dashboard protection/no-flash bootstrap via `/api/auth/me`, logout thunk/UI, auth status in user slice, targeted tests.
- **Settings**: Added `Setting` Prisma model, shared types, `features/settings` GET/PUT (`settings:manage`), registered feature, wired admin settings page to real persistence.
- **Media**: Added multipart upload, validation/magic-byte checks, local/S3(MinIO) storage adapters, Sharp normalization, storage-backed delete, `Media.storage_key` schema+migration SQL, MinIO docker compose service.
- **Reconciliation**: Removed `apps/admin/tsconfig.tsbuildinfo`; added `*.tsbuildinfo` to `.gitignore`; verified no `any` in new P1 files.
- **Verification**:
  - `pnpm build` ✅ (33/33 tasks successful)
  - `pnpm test:run` ✅ (21 passed / 2 skipped, 181 passed / 21 skipped)
  - `pnpm lint` ✅ (13/13 tasks successful; warnings only)

### 2026-11-26 — Phase 1 batch 2 (parallel agents + reconciliation)
- **Tracks**: Comments/moderation, revision lifecycle integration, admin UX cleanup.
- **Comments**: Added `Comment` model/status/migration SQL, shared comment types + `comment:moderate` capability, `features/comments` API (public create with validation/rate limit, moderator list/get/moderate/delete), admin comments page + sidebar nav.
- **Revisions**: Content updates emit `content:before_update` for pre-update snapshots; restore applies full snapshot with publish-cap/slug-conflict guards and pre-restore snapshot.
- **Admin UX**: Real dashboard stats, fixed content editor lint `any`, marketplace catalog-preview cleanup, emoji/style consistency fixes in touched files.
- **Reconciliation**: Fixed `content.service.test.ts` invocationCallOrder TS strictness; removed unused type in comments page.
- **Verification**:
  - `pnpm build` ✅ (33/33 tasks successful)
  - `pnpm test:run` ✅ (23 passed / 2 skipped, 195 passed / 21 skipped)
  - `pnpm lint` ✅ (13/13 tasks successful)

### 2026-11-26 — Next.js 16.4 + shadcn/ui setup & theme/config reconciliation
- **Upgrade**: Bumped admin/renderer to `next@^16.4.6`, `react@^19.2.0`, `react-dom@^19.2.0`, added `@types/react-dom`. Fixed Next 16 build type-check by adding `vi` import in `apps/admin/src/components/builder/__tests__/blocks.test.tsx`.
- **shadcn init**: Initialized shadcn in admin and renderer (`shadcn@4.23.1`, `--defaults`, base-nova, Tailwind v4, css variables). Added `components.json`, `lib/utils.ts`, shadcn deps and core UI components.
- **Config reconciliation**: Updated admin/renderer lint scripts from removed `next lint` to `eslint src/` (Next 16 compatibility). Verified `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `components.json`.
- **Theme tokens**: Neutral shadcn semantic tokens with **sky primary** (`--primary` sky oklch), sharp radius (`--radius: 0.25rem`), dark mode tokens, Tailwind v4 `@theme inline` mappings. Removed brand-named utility classes and custom drop-shadow overrides; added `@utility scrollbar-theme` using `@apply scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent`.
- **UI reconciliation**: Moved legacy `components/ui.tsx` to `components/feedback.tsx`; cleaned renderer layout to semantic classes; normalized shadcn button radius/ring.
- **Verification**: build/test/lint green at time of change.

### 2026-11-26 — Wave 1+2: shadcn foundation, auth completeness, renderer/admin rewrites (parallel agents)
- **Wave 1 (parallel)**: Admin foundation, Auth completeness, Renderer rewrite.
- **Admin foundation**: TooltipProvider+Sonner wired; legacy `feedback.tsx`/`ui_components.tsx` reimplemented on shadcn primitives with compat exports; sidebar/auth guard/layout moved to semantic tokens.
- **Auth completeness (P1 PARTIAL)**: password reset + email verification flows; hashed/expiring/single-use tokens; Prisma `User.email_verified*` + `AuthToken` model + migration SQL (not applied); shared types; auth routes/validators/rate limits/CSRF exemptions; email service hooks with safe fallback; admin auth pages (forgot/reset/verify). `db:generate` ✅.
- **Renderer rewrite (P1 PARTIAL)**: semantic/shadcn UI, typed API layer, ISR tags (`revalidate=60`), `generateMetadata`/OG/Twitter defaults, loading/error/not-found, `@typepress/theme-sdk` default slots.
- **Wave 2 (parallel, after foundation)**: admin page rewrites for content/users/comments, media/settings/taxonomy/menus, dashboard/builder/marketplace/revisions. Shadcn/semantic patterns, loading/error/empty states, AlertDialog confirmations, Sonner feedback, accessibility labels/focus, no `any` in scoped files.
- **Reconciliation**: full verification green after all agents.
- **Verification**: build/test/lint green at time of change.

### 2026-11-26 — Wave 3: plugin runtime, RHF/Zod forms, block editor↔content integration (parallel agents)
- **Plugin runtime (P1 PARTIAL)**: real plugin discovery/load/manifest validation in core+API, failure isolation, `load_safely`/records, optional `register_routes(app)`, compat exports preserved, `/health` additive `plugin_details`, admin marketplace shows runtime status. Targeted tests added.
- **RHF+Zod forms (P1 PARTIAL)**: migrated admin auth/settings/users/taxonomy/menus forms to react-hook-form + zodResolver + shadcn Field patterns; preserved API flows and improved validation/loading/error states.
- **Block editor ↔ content (P1 PARTIAL)**: shared builder types + strict Zod `meta.builder_data` validation; admin content editor integrates BlockEditor load/edit/save while preserving other meta; renderer safely renders builder blocks (sanitized URLs/colors/sizes, no dangerous HTML) with fallback to excerpt/body.
- **Reconciliation**: full verification green after all agents.

### 2026-11-26 — Wave 4: auth hardening, media variants, plugin persistence (parallel agents)
- **Auth hardening (P1 PARTIAL)**: password reset revokes existing sessions via `SessionStore.destroy_by_user_id` (Redis+memory); reset response sanitized; resend-verification UI added to verify-email/login; targeted tests added.
- **Media thumbnails/variants (P1 PARTIAL)**: Sharp WebP variants (thumbnail/small/medium/large), `Media.width/height/variants` schema+shared types, storage upload/delete cleanup for local/S3, API returns variants, admin media previews. Migration SQL created (not applied); `db:generate` ✅.
- **Plugin enable/disable persistence (P1 PARTIAL)**: `PluginState` DB model+migration SQL (not applied), shared plugin types, runtime respects disabled state, admin-protected `/api/plugins` list/toggle endpoints (`settings:manage`), marketplace toggle UI; restart required for runtime unload/load.
- **Reconciliation**: fixed lint issue in `media/page.tsx` (`@next/next/no-img-element` disable comment not compatible with root eslint config; replaced with safe JSX comment). Full verification green.
- **Verification**:
  - `pnpm build` ✅ (33/33 tasks successful)
  - `pnpm test:run` ✅ (28 passed / 2 skipped, 228 passed / 21 skipped)
  - `pnpm lint` ✅ (13/13 tasks successful)

### 2026-11-26 — Prisma→Drizzle ORM migration + OWASP/argon2id hardening (parallel agents + reconciliation)
- **DB package**: migrated `@typepress/db` from Prisma to Drizzle ORM (`drizzle-orm`/`drizzle-kit`/`pg`); added `src/schema.ts`, `drizzle.config.ts`, singleton `db`/Pool client, Drizzle `src/seed.ts`; removed `packages/db/prisma` legacy artifacts; kept temporary `prisma` compat alias export.
- **API/infra migration**: parallel subagents migrated auth/user/middleware, content/revision, comments/taxonomy/menu/settings, media/plugins/search, GraphQL/realtime/infra and affected tests to Drizzle queries/operators/`sql` with strict typing (no `any`, no `Prisma.*`).
- **Auth/OWASP hardening**: argon2id password hashing (`@node-rs/argon2`, OWASP params), transparent legacy bcrypt verify + rehash-on-login, stronger password policy, normalized emails, generic/enumeration-resistant auth errors, dummy verify on missing user, session rotation preserved, password reset revokes sessions; production session-secret guard added in config.
- **AGENTS.md**: replaced Prisma-specific rules with Drizzle conventions and added mandatory OWASP-aligned security rules (authn/authz, validation, injection/XSS/SSRF/path traversal, secrets/logging, cookies/CORS/headers/CSRF, GraphQL/socket abuse controls, dependency hygiene, security regression tests).
- **Reconciliation fixes**: added `published_at` to content sort schema (fix TS2367), removed unused `and` import in DB seed, confirmed no TS/TSX Prisma client refs remain outside lockfile.
- **Verification**:
  - `pnpm build` ✅ (33/33 tasks successful)
  - `pnpm test:run` ✅ (28 passed / 2 skipped, 234 passed / 21 skipped)
  - `pnpm lint` ✅ (13/13 tasks successful)

## Verification Log
- `pnpm install` ✅ (lockfile up to date)
- `pnpm build` ✅ (33/33 tasks successful)
- `pnpm test:run` ✅ (28 passed / 2 skipped, 234 passed / 21 skipped; env-gated e2e)
- `pnpm lint` ✅ (13/13 tasks successful)

## Remaining Next Steps
1. **Drizzle migration cleanup**: remove temporary `prisma` compat alias after all consumers migrated; consolidate Drizzle migration generation/apply strategy (drizzle-kit generate/migrate) and document CI/DB env workflow; prune stale lockfile prisma entries on next dependency refresh.
2. **System-wide OWASP pass**: security headers/CSP, cookie/CSRF/origin checks across all state-changing routes, upload magic-byte/path traversal/SSRF guards, GraphQL depth/complexity limits hardening, socket payload/rate-limit audit, log redaction, dependency audit/updates, regression tests.
3. **Auth follow-ups**: Redis-backed/distributed lockout and token-send throttling, apply/persist auth+media+plugin Drizzle migrations in DB env, fully non-enumerating registration flow if product allows.
4. **P1 product gaps**: plugin hot reload/unload polish, custom content types/fields, workflows/i18n/webhooks, SEO/ISR revalidation hooks, block editor/content integration polish.
5. **Quality/ship**: integration/E2E coverage for new auth/content/plugin/media flows, Dockerfiles/observability, CI quality gates, migration apply strategy.
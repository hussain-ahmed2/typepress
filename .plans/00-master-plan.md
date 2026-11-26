# Typepress Master Plan — WordPress/Competitor Parity

> Generated: 2026-11-26  
> Status: Active  
> Owner: AI execution track (multi-agent)

## Goal
Make Typepress a production-ready, secure, extensible TypeScript CMS competitive with WordPress and modern headless CMS platforms (Strapi, Ghost, Payload, Drupal), covering core CMS functionality, admin UX, developer extensibility, security, and operational readiness.

## Baseline (Audited)
- Monorepo: Fastify API, Next.js admin, Next.js renderer, core/db/shared-types/plugin-sdk/theme-sdk.
- API features: auth, content, media, taxonomy, menu, user, revision, search.
- DB: User, Content, Media, Taxonomy, TaxonomyRelation, Session, Menu, MenuItem, Revision.
- Infra: session/cookie/CORS/rate-limit/helmet/error handler, GraphQL, Socket.IO, RSS/sitemap/export-import, scheduler, email/cache/image services.
- Tests: 10 test files total; coverage thin.

## Critical P0 Findings
1. **Auth bridge missing/broken** - auth sets `request.session.user_id`; middleware checks `request.user_id`; no bridge found. (`apps/api/src/features/auth/auth.routes.ts`, `apps/api/src/infrastructure/middleware/auth.middleware.ts`)
2. **Plugin runtime fake** - plugin loader reads manifests but does not load/execute plugin modules. (`apps/api/src/plugin_loader.ts`)
3. **GraphQL authZ missing** - mutations unauthenticated/context-less; create uses `author_id: 'system'`. (`apps/api/src/graphql/resolvers.ts`)
4. **Search SQL injection risk** - `type` interpolated into raw SQL. (`apps/api/src/features/search/search.service.ts`)
5. **Media placeholder** - metadata only; no real storage/upload/delete pipeline. (`apps/api/src/features/media/media.service.ts`)
6. **Export/import weak controls** - auth-only, no capability; import creates placeholder password hashes. (`apps/api/src/server.ts`, `apps/api/src/infrastructure/export_import.ts`)
7. **Socket.IO unauthenticated** - no auth/room authorization. (`apps/api/src/realtime/socket.ts`)

## Roadmap

### Phase 0 — Stabilize & Secure Foundation (P0)
- [ ] Auth/session bridge: session -> request.user_id; secure cookie config; Redis/DB session store; logout invalidation.
- [ ] RBAC everywhere: capability checks for content/media/taxonomy/menu/revision/user/export/import/graphql/socket.
- [ ] Fix search SQLi: parameterize all raw queries; tests.
- [ ] GraphQL auth context + resolver authorization; remove system author; add limits.
- [ ] Socket.IO authentication/authorization.
- [ ] Export/import hardening: admin capability, validation, safe import, audit.
- [ ] CSRF protection for cookie-auth state-changing routes.
- [ ] Security regression tests; CI baseline build+test+lint+typecheck.

**Exit criteria:** No unauth privileged mutation; auth/RBAC reliable; critical vulns fixed; regression tests pass.

### Phase 1 — Core CMS Parity (P1)
- [ ] Real media pipeline: multipart upload, MinIO/S3 adapter, Sharp transforms, metadata, delete, permissions.
- [ ] Settings system: DB/model/API/admin UI wiring, typed registry.
- [ ] Users/RBAC admin: roles/capabilities management, password reset, email verification, optional 2FA.
- [ ] Comments/moderation: model, API, admin UI, spam hooks.
- [ ] Revisions integrated into content lifecycle; diff/restore permissions.
- [ ] Scheduler reliability: queue/lock, hooks, retry.
- [ ] Admin UX baseline: auth guard/bootstrap, logout, notifications, error handling, remove stubs.

**Exit criteria:** Admin can manage core CMS objects through real APIs/UI.

### Phase 2 — Modern Editor & Renderer (P1)
- [ ] Block editor persistence integrated with content create/edit/preview.
- [ ] Reusable blocks/patterns, media picker, taxonomy/SEO panels.
- [ ] Renderer theme runtime integration with `@typepress/theme-sdk`.
- [ ] SEO metadata, ISR/revalidation, robots/OG/schema, safe rich/block rendering.
- [ ] Menu builder complete (reorder/nesting/locations).

**Exit criteria:** End-to-end authoring and themed publishing flow works.

### Phase 3 — Extensibility Platform (P1)
- [ ] Real plugin runtime: load/execute modules, lifecycle, DB state, manifest validation, dependency/capability checks, error isolation.
- [ ] Admin extension points and plugin settings.
- [ ] Theme activation/config/preview runtime.
- [ ] CLI for scaffold/dev/build/migrate/doctor.
- [ ] Docs reconciled with reality.

**Exit criteria:** First-party plugin can be enabled/disabled and extend hooks/routes/admin settings.

### Phase 4 — Headless/Enterprise Parity (P2)
- [ ] Custom content types/fields/relations/validation/migrations.
- [ ] Editorial workflows, approvals, audit log.
- [ ] i18n/locales/localized routes/sitemaps.
- [ ] REST+GraphQL completeness, webhooks, preview tokens, OpenAPI/SDL.
- [ ] Pluggable search + cache invalidation strategy.

### Phase 5 — Ecommerce (P2, separate track)
- [ ] Transactional domain models (Product/Variant/Inventory/Cart/Order/Payment/Refund/Shipment/Tax/Coupon/Customer).
- [ ] Stripe/PayPal sandbox, webhooks, idempotent checkout, order state machine.
- [ ] Admin catalog/order/customer ops, invoices/emails.
- [ ] Only after core platform stability gates pass.

## Cross-Cutting
- Security: threat model, dependency/secret/SAST/container scans, audit logs, backup/restore drills.
- Quality: unit/integration/e2e/security regression, isolated test DB, CI gates.
- Ops: structured logs/metrics/tracing, readiness, queue/worker, production Dockerfiles, deploy/runbook.
- Docs: keep docs accurate; mark stubs/experimental; generate API refs.

## Definition of Done (global)
- `pnpm build` passes.
- `pnpm test:run` passes (or targeted tests for touched area + documented exceptions).
- No new `any`, no console.log in production code paths.
- Security/authZ considered for every endpoint/UI action.
- Docs/progress updated.
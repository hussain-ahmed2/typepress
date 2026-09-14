# Typepress: Master Plan
### A TypeScript-native CMS designed to surpass WordPress

---

## 1. Where WordPress is actually weak (your targets)

To be *better*, not just *equivalent*, aim squarely at these:

| WordPress weakness | Your advantage |
|---|---|
| PHP, no static typing → plugin conflicts, runtime errors | Full TypeScript, typed hook system, typed plugin SDK |
| Global function namespace (`add_action`, `the_content()`) | Proper module system, typed events, no global pollution |
| MySQL-only, rigid schema, meta as serialized blobs | Prisma + Postgres JSONB, real query-ability on meta |
| Admin UI is jQuery-era, slow with big sites | Next.js admin, optimistic UI, React Query caching |
| Security: plugins run with full trust, huge attack surface | Capability-scoped plugin permissions, opt-in API access per plugin |
| No built-in real-time collaboration | Socket.IO-powered live editing, presence, comments (you already use this) |
| REST API bolted on later, inconsistent | API-first from day one — admin UI itself is just an API consumer |
| Theme system = PHP template files, no real component model | React Server Components as the theme layer |
| Hosting = shared PHP hosting, no horizontal scaling story | Stateless API, Redis-backed sessions/cache, container-native |

Keep this table as your north star when making trade-off calls later — anytime you're tempted to copy a WP pattern, ask if it's *actually* good or just familiar.

**Constraint: free/open-source resources only.** Every piece of the stack below is free and self-hostable — no paid SaaS dependencies baked into the core product. Where a "usual" choice is paid (e.g. AWS S3, Algolia, Vercel), the plan uses the free/self-hosted equivalent instead so the whole thing can run entirely on infrastructure you control at zero licensing cost.

---

## 2. Finalized tech stack

- **Language**: TypeScript everywhere (shared types across API/admin/renderer)
- **API**: Node.js + Express (or Fastify — faster, first-class TS support, worth considering)
- **Admin panel**: Next.js (App Router), React Query, Tiptap (block/rich-text editor)
- **Public renderer**: Next.js, SSR + ISR per-content-type, React Server Components for themes
- **Database**: PostgreSQL (JSONB for flexible meta) via Prisma
- **Cache/sessions/queues**: Redis
- **Real-time**: Socket.IO — live collaborative editing, presence indicators, live preview
- **Search**: Postgres full-text to start; swap to self-hosted Meilisearch/Typesense (both free/OSS) when scale demands it
- **Media storage**: MinIO (free, S3-compatible, self-hosted) for both dev *and* prod — no paid object storage required
- **Drag-and-drop builder**: Craft.js (free, open-source React framework for building drag-and-drop editors) or GrapesJS (free, open-source, framework-agnostic page-builder engine) as the base — see section 4.6
- **Auth**: Session-based (Redis-backed) + capability system, not just roles
- **Infra**: Docker Compose for dev, containers deploy anywhere — self-hostable on any free-tier VPS, no dependency on paid platforms
- **Monorepo tooling**: Turborepo or Nx (both free/OSS)

---

## 3. Monorepo structure

```
typepress/
/apps
  /admin          Next.js admin panel
  /api            Express API — auth, content, plugins, media
  /renderer       Next.js public site (theme rendering)
/packages
  /core           hook registry, capability system, plugin loader
  /db             Prisma schema, migrations, seed scripts
  /plugin-sdk     typed SDK for plugin authors
  /theme-sdk      typed SDK for theme authors (slots, layout primitives)
  /shared-types   types shared across apps
/plugins          first-party plugins (dev)
/themes           first-party themes (dev)
/docker
```

---

## 4. Core architecture pieces

### 4.1 Hook system
Typed `emit`/`on` (actions) and `applyFilters` (filters) registry — every core operation routes through it so plugins can hook in without touching core code. (Full design covered previously — this is the load-bearing piece of the whole system.)

### 4.2 Capability-based permissions (better than WP roles)
WordPress roles are coarse (`editor`, `admin`). Model fine-grained capabilities instead:

```ts
type Capability =
  | 'content:create' | 'content:edit:own' | 'content:edit:any'
  | 'content:publish' | 'media:upload' | 'users:manage'
  | 'plugins:install' | 'settings:manage';

type Role = { name: string; capabilities: Capability[] };
```

Extend this to **plugins themselves**: a plugin declares which capabilities/API scopes it needs at install time (like mobile app permissions), and the admin can see/approve it. This alone is a meaningful security upgrade over WP, where any plugin can do anything.

### 4.3 Content model
Generic `Content` table (type + JSONB meta) for flexibility, with strongly-typed tables for Users, Media, Taxonomies, Comments. Plugins register new content types by declaring a Zod schema for their `meta` shape — validated at write time, no migrations needed per plugin.

### 4.4 Plugin loading strategy
Start **in-process** (plugins are trusted npm packages loaded at boot) for your first-party plugin set and MVP. Add **worker-thread isolation** once you open plugin authoring to others — this is what actually prevents "one bad plugin takes down the whole site," a real WordPress pain point.

### 4.5 Theme system
Themes are React component packages implementing a defined "slot" contract (Header, PostList, SinglePost, Footer, etc.) rather than PHP template files. This gets you real component reuse, type-checked props, and no template-tag guessing. The visual builder (4.6) is what non-developers actually use day-to-day; the slot contract is what developer-authored themes plug into underneath it.

### 4.6 Visual drag-and-drop builder (Elementor/Wix-style)
This is the feature that makes it usable by non-developers, not just a dev-facing CMS — and it's a substantial piece of work in its own right, worth treating as close to its own product inside the product.

- **Base library**: Craft.js — free, open-source, gives you a canvas + node tree + drag/drop primitives without building the low-level DnD logic yourself. (GrapesJS is the alternative if you'd rather a more Wix-like, framework-agnostic HTML/CSS editor out of the box.)
- **Block model**: every draggable element (text, image, button, columns, container, custom plugin-registered blocks) is a typed component with a props schema — plugins can register new blocks the same way they register content types or hooks.
- **Persistence**: the builder serializes the page tree to JSON, stored in `Content.meta`. Rendering reads that JSON server-side and maps it back to the same component registry — so the builder output *is* what gets rendered, no separate "compile" step.
- **Responsive editing**: per-breakpoint overrides stored per-node (desktop/tablet/mobile), matching what Elementor/Wix users expect.
- **Global styles & reusable sections**: theme-level design tokens (colors, spacing, fonts) the builder pulls from, plus save-as-reusable-block/section support.
- **Undo/redo + autosave**: table-stakes for a builder UX — Craft.js gives you the history stack, you wire autosave via the existing content API.

Treat this as roughly its own phase (see Phase 2.5 below) rather than squeezing it into the theme-SDK work — it's meaningfully more effort than a typical plugin/theme feature.

---

## 5. Phased roadmap

### Phase 0 — Foundations (2-3 weeks)
- Monorepo scaffold, Docker Compose (Postgres, Redis, MinIO)
- Prisma schema v1: Content, User, Media, Taxonomy, Session
- Auth: register/login, capability system, session middleware
- Hook registry package with 5-6 core hooks wired through real operations

### Phase 1 — MVP CMS (4-6 weeks)
- Admin panel: content list, Tiptap-based editor, media library, publish/draft workflow
- Public renderer: single post/page rendering, basic default theme
- REST API covering content CRUD, media upload, auth
- Categories/tags (taxonomies), revisions, basic SEO fields

**Milestone: you can run a real blog on it.**

### Phase 2 — Extensibility (4-6 weeks)
- Plugin SDK + loader (in-process), plugin manager UI in admin
- Theme SDK + at least 2 real themes to prove the slot contract works
- Rebuild 1-2 "core" features (SEO panel, comments) *as* plugins — this is the real test of whether your API is good enough
- Capability-scoped plugin permissions

**Milestone: third parties could theoretically write a plugin/theme against documented APIs.**

### Phase 2.5 — Visual drag-and-drop builder (4-6 weeks)
- Craft.js integration: canvas, node tree, drag/drop, component registry
- Core block set: text, image, button, container/columns, video embed, form
- Responsive (desktop/tablet/mobile) per-node overrides
- Global style tokens + reusable saved sections/blocks
- Autosave + undo/redo, JSON tree persisted to `Content.meta` and rendered server-side on the public site

**Milestone: a non-developer can build a full page visually and publish it, no code required — this is the Elementor/Wix-equivalent moment.**

### Phase 3 — WordPress feature parity (6-8 weeks)
- Custom post types & fields (plugin-declarable, ACF-equivalent built-in — WP needs a plugin for this, you don't)
- Menus/navigation builder, widgets/blocks system
- Multi-user workflows: comments, moderation, user roles UI
- Media library improvements: image transforms/resizing on upload
- Import tool: WordPress XML export → your format (huge adoption unlock)

### Phase 4 — Differentiators (ongoing)
- Real-time collaborative editing (Socket.IO — two editors, one post, live cursors)
- Type-safe headless/GraphQL API as first-class option, not an afterthought
- Built-in performance: ISR-based caching instead of a maze of caching plugins
- Plugin marketplace with sandboxed execution (isolated-vm or WASM) once demand justifies it
- Better search (Meilisearch integration) out of the box

### Phase 5 — Launch hardening
- Load testing, rate limiting, CSRF/XSS audit, dependency scanning
- Automated backups, staging/prod environment story
- Onboarding flow, docs site, plugin/theme developer docs

---

## 6. Realistic timeline

Solo, part-time-around-a-job pace: Phase 0-2 (a usable, extensible CMS) is roughly **4-5 months**. Adding the drag-and-drop builder (Phase 2.5) is another **1-1.5 months** on top of that. Full WP feature parity (Phase 3) pushes the total to roughly **9-11 months**. Differentiators (Phase 4) are ongoing after that — don't block launch on them. Launch after Phase 2.5/early Phase 3 with a narrower feature set beats a 10-month silent build.

## 7. Naming & reservations
- **Project name**: Typepress
- Reserve early, before more code is written: `typepress` on npm (open as of last check), a `typepress` GitHub org, and the domain (typepress.com/.dev/.io) closer to launch
- Note: a separate, unrelated Rust project also uses the name "Typepress" (an HTML/CSS → PDF engine), published to npm under `typepress-pdf` — not a package-name conflict, but worth knowing for SEO/discoverability once you're promoting the project

## 8. Immediate next steps
1. Reserve the `typepress` npm name and GitHub org
2. Scaffold the monorepo + Docker Compose stack
3. Prisma schema v1 (Content, User, Media, Taxonomy)
4. Hook registry package
5. Auth + capability middleware

# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Typepress                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                │
│  │  Admin  │  │Renderer │  │   API   │                │
│  │ (React) │  │ (Next)  │  │(Fastify)│                │
│  └────┬────┘  └────┬────┘  └────┬────┘                │
│       │            │            │                       │
│       └────────────┴────────────┘                       │
│                    │                                    │
│              ┌─────┴─────┐                              │
│              │   Core    │                              │
│              │ (Types)   │                              │
│              └─────┬─────┘                              │
│                    │                                    │
│  ┌─────────────────┴─────────────────┐                 │
│  │                                   │                 │
│  │  ┌──────┐  ┌──────┐  ┌──────┐   │                 │
│  │  │Redis │  │Postgr│  │Socket│   │                 │
│  │  │      │  │  -es │  │  .IO │   │                 │
│  │  └──────┘  └──────┘  └──────┘   │                 │
│  │                                   │                 │
│  └───────────────────────────────────┘                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
typepress/
├── apps/
│   ├── api/           # Fastify REST API + GraphQL
│   ├── admin/         # Next.js admin panel
│   └── renderer/      # Next.js public site
├── packages/
│   ├── core/          # HookRegistry, CapabilityChecker, PluginManager
│   ├── db/            # Prisma schema + migrations
│   ├── shared-types/  # TypeScript types
│   ├── plugin-sdk/    # Plugin development SDK
│   └── theme-sdk/     # Theme development SDK
├── plugins/           # First-party plugins (18 total)
├── themes/            # First-party themes (7 total)
├── docker/            # Docker configuration
└── docs/              # Documentation
```

## Dependency Flow

```
apps/* → packages/* (never the reverse)
packages/shared-types → no dependencies (leaf node)
packages/core → packages/shared-types, fastify
packages/db → @prisma/client
packages/plugin-sdk → packages/core, packages/shared-types
packages/theme-sdk → packages/shared-types, react
```

**Rule:** Apps depend on packages. Packages never depend on apps.

## Feature-Based Architecture

Each feature (auth, content, media, taxonomy) is a self-contained module:

```
apps/api/src/features/
├── auth/
│   ├── index.ts              # FeaturePlugin export
│   ├── auth.routes.ts        # HTTP handlers
│   ├── auth.service.ts       # Business logic (OOP class)
│   ├── auth.validators.ts    # Zod schemas
│   └── auth.types.ts         # Feature-internal types
├── content/
│   ├── index.ts
│   ├── content.routes.ts
│   ├── content.service.ts
│   └── content.validators.ts
├── media/
│   ├── index.ts
│   ├── media.routes.ts
│   ├── media.service.ts
│   └── media.validators.ts
├── taxonomy/
│   ├── index.ts
│   ├── taxonomy.routes.ts
│   ├── taxonomy.service.ts
│   └── taxonomy.validators.ts
└── index.ts                # Feature registry
```

## Adding a New Feature

1. Create directory under `apps/api/src/features/your_feature/`
2. Implement `FeaturePlugin` interface
3. Create routes, service, validators
4. Import and register in `apps/api/src/features/index.ts`

**That's it — no existing code needs modification.**

## Hook System

```typescript
// Register a hook
api.hooks.on('content:after_create', async (content) => {
  console.log('New content:', content.title);
});

// Emit a hook
await hooks.emit('content:after_create', new_content);

// Register a filter
api.register_filter('content:render_title', (title) => {
  return title.toUpperCase();
});

// Apply a filter
const title = hooks.apply_filters('content:render_title', 'hello');
```

## Capability System

```typescript
// Fine-grained permissions
type Capability =
  | 'content:create' | 'content:edit:own' | 'content:edit:any'
  | 'content:publish' | 'media:upload' | 'users:manage'
  | 'plugins:install' | 'settings:manage';

// Check capabilities
const checker = new CapabilityChecker(user.capabilities);
if (checker.has('content:create')) { ... }
if (checker.has_any(['media:upload', 'media:delete'])) { ... }
```

## Plugin System

```typescript
// Plugin structure
export default define_plugin({
  name: 'my-plugin',
  version: '1.0.0',
  register(api) {
    api.hooks.on('content:after_create', async (content) => {
      // Plugin logic here
    });
  },
});
```

## Theme System

```typescript
// Theme structure
export default define_theme({
  name: 'my-theme',
  version: '1.0.0',
  slots: {
    header: Header,
    footer: Footer,
    post_list: PostList,
    single_post: SinglePost,
  },
});
```

## Data Flow

```
Client Request
    ↓
Fastify (validation, auth, rate limiting)
    ↓
Feature Routes (input validation)
    ↓
Feature Service (business logic)
    ↓
Prisma (database query)
    ↓
Response (ApiResponse format)
```

## Security Layers

1. **Rate Limiting** — 100 req/min global, 5/min auth
2. **Security Headers** — Helmet (CSP, HSTS, etc.)
3. **CORS** — Configured for admin origin
4. **Session Auth** — Cookie-based with secure flags
5. **Capability Checks** — Fine-grained permissions
6. **Input Validation** — Zod schemas on all inputs
7. **Password Hashing** — bcrypt with cost factor 12

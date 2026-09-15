# Getting Started with Typepress

## Prerequisites

- **Node.js** 20+ (recommended: latest LTS)
- **pnpm** 9+ (package manager)
- **Docker** & Docker Compose (for database)
- **Git** (for version control)

## Installation

### 1. Clone the Repository

```bash
git clone git@github.com-personal:hussain-ahmed2/typepress.git
cd typepress
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start Infrastructure

```bash
pnpm docker:up
```

This starts:
- PostgreSQL 16 on port 5433
- Redis 7 on port 6380

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
DATABASE_URL="postgresql://typepress:typepress_secret@localhost:5433/typepress"
REDIS_URL="redis://localhost:6380"
SESSION_SECRET="your-secret-key-here-32-chars-min"
```

### 5. Set Up Database

```bash
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations
pnpm db:seed        # Create admin user
```

### 6. Start Development

```bash
pnpm dev
```

This starts all three apps:
- **API**: http://localhost:8000
- **Admin**: http://localhost:8001
- **Renderer**: http://localhost:8002

## First Login

1. Open http://localhost:8001/login
2. Login with:
   - Email: `admin@typepress.dev`
   - Password: `test` (any password works in dev mode)

## Creating Your First Post

1. Go to http://localhost:8001/content
2. Click "New Content"
3. Enter a title and slug
4. Select "Post" as type
5. Click "Create"
6. Edit the post content
7. Change status to "Published"
8. Click "Update"

## Viewing Your Post

1. Go to http://localhost:8002
2. Your post should appear in the list
3. Click to view the full post

## Project Structure

```
typepress/
├── apps/
│   ├── api/           # Fastify REST API
│   ├── admin/         # Next.js admin panel
│   └── renderer/      # Next.js public site
├── packages/
│   ├── core/          # Hook registry, capabilities
│   ├── db/            # Prisma schema + migrations
│   ├── shared-types/  # TypeScript types
│   ├── plugin-sdk/    # Plugin development SDK
│   └── theme-sdk/     # Theme development SDK
├── plugins/           # First-party plugins
├── themes/            # First-party themes
├── docker/            # Docker configuration
├── docs/              # Documentation
└── .plans/            # Project plans
```

## Available Commands

```bash
# Development
pnpm dev              # Start all apps
pnpm build            # Build all apps
pnpm lint             # Lint all apps

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed database
pnpm db:studio        # Open Prisma Studio

# Docker
pnpm docker:up        # Start infrastructure
pnpm docker:down      # Stop infrastructure
pnpm docker:logs      # View logs

# Testing
pnpm test             # Run tests in watch mode
pnpm test:run         # Run tests once
pnpm test:coverage    # Run with coverage
```

## Next Steps

- [Architecture](./architecture.md) — Understand the system design
- [API Reference](./api-reference.md) — Explore the API
- [Plugin Development](./plugin-development.md) — Build your first plugin
- [Theme Development](./theme-development.md) — Create a custom theme
- [Deployment](./deployment.md) — Deploy to production

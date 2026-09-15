# Typepress Documentation

Welcome to Typepress — a TypeScript-native CMS designed to surpass WordPress.

## Quick Navigation

| Guide | Description |
|---|---|
| [Getting Started](./getting-started.md) | Installation and first steps |
| [Architecture](./architecture.md) | System design and patterns |
| [API Reference](./api-reference.md) | Complete REST + GraphQL API docs |
| [Plugin Development](./plugin-development.md) | Build your own plugins |
| [Theme Development](./theme-development.md) | Create custom themes |
| [Deployment](./deployment.md) | Production deployment guide |
| [E-commerce](./ecommerce.md) | Online store setup |
| [Security](./security.md) | Security best practices |

## Features

### Core CMS
- Content management with custom post types
- Media library with image processing
- Taxonomies (categories, tags)
- Menus and navigation
- User management with roles
- Content revisions
- Scheduled posts
- Sticky posts
- Post formats
- Password-protected posts
- RSS feeds
- XML sitemaps
- Search with full-text

### Developer Experience
- TypeScript throughout
- REST + GraphQL APIs
- Real-time collaboration (Socket.IO)
- Plugin SDK with typed hooks
- Theme SDK with slot system
- Feature-based architecture

### E-commerce
- Product management with variations
- Shopping cart
- Checkout with Stripe/PayPal
- Order management
- Coupon system
- Shipping zones
- Tax rates
- Email templates
- PDF invoices
- Subscriptions

### Admin UI
- Modern React + Redux
- Visual page builder (Craft.js)
- Media library
- Menu builder
- User management
- Settings
- Plugin/theme marketplace

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| API | Fastify 5 |
| Admin | Next.js 15, React 19, Redux Toolkit |
| Renderer | Next.js 15 (SSR/ISR) |
| Database | PostgreSQL 16 via Prisma |
| Cache | Redis 7 |
| Real-time | Socket.IO |
| GraphQL | GraphQL Yoga |
| Testing | Vitest |
| Monorepo | Turborepo + pnpm |

## Support

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Discord**: Real-time community support

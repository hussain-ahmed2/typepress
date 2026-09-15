# Plugin Development Guide

## Overview

Typepress plugins extend the system's functionality through hooks, filters, and the plugin API. Plugins are self-contained packages in the `plugins/` directory.

## Plugin Structure

```
plugins/my-plugin/
├── typepress.plugin.json    # Manifest (required)
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
└── src/
    └── index.ts             # Plugin entry point
```

## Plugin Manifest

Every plugin must have a `typepress.plugin.json` file:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My awesome plugin",
  "dependencies": ["content"],
  "author": "Your Name"
}
```

## Plugin Entry Point

```typescript
import { define_plugin } from '@typepress/plugin-sdk';

export default define_plugin({
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My awesome plugin',

  register(api) {
    // Register hooks
    api.hooks.on('content:after_create', async (...args) => {
      const content = args[0] as Record<string, unknown>;
      console.log('New content:', content.title);
    });

    // Register filters
    api.register_filter('content:render_title', (...args) => {
      const title = args[0] as string;
      return title.toUpperCase();
    });

    console.log('My plugin loaded!');
  },
});
```

## Plugin API

The `api` object provides:

| Method | Description |
|---|---|
| `api.hooks.on(name, handler, priority?)` | Register an action hook |
| `api.hooks.emit(name, ...args)` | Emit a hook event |
| `api.hooks.register_filter(name, handler, priority?)` | Register a filter |
| `api.hooks.apply_filters(name, value, ...args)` | Apply a filter pipeline |
| `api.on(name, handler, priority?)` | Shorthand for hooks.on |
| `api.emit(name, ...args)` | Shorthand for hooks.emit |
| `api.register_filter(name, handler, priority?)` | Shorthand for hooks.register_filter |
| `api.apply_filters(name, value, ...args)` | Shorthand for hooks.apply_filters |

## Available Hooks

### Content Hooks
| Hook | Arguments | When |
|---|---|---|
| `content:before_create` | data | Before content is created |
| `content:after_create` | content | After content is created |
| `content:before_update` | data | Before content is updated |
| `content:after_update` | content | After content is updated |
| `content:before_delete` | content | Before content is deleted |
| `content:after_fetch` | content | After content is fetched |

### Auth Hooks
| Hook | Arguments | When |
|---|---|---|
| `auth:before_login` | { email } | Before login attempt |
| `auth:after_login` | user | After successful login |
| `auth:password_reset_requested` | { user_id, email } | When reset is requested |

### Order Hooks (E-commerce)
| Hook | Arguments | When |
|---|---|---|
| `order:before_create` | order_data | Before order is created |
| `order:after_create` | order | After order is created |
| `order:status_changed` | { order_id, status } | When order status changes |

### Plugin Hooks
| Hook | Arguments | When |
|---|---|---|
| `plugin:loaded` | plugin_name | After a plugin is loaded |

## Available Filters

| Filter | Input | Output | Description |
|---|---|---|---|
| `content:render_title` | string | string | Transform content title |
| `content:render_excerpt` | string | string | Transform content excerpt |
| `content:share_urls` | object | object | Add share URLs to content |
| `analytics:view_count` | content_id | number | Get view count for content |

## Priority

Hooks and filters execute in priority order (lower = runs first):

```typescript
// Default priority is 10
api.hooks.on('content:after_create', handler, 5);  // Runs early
api.hooks.on('content:after_create', handler, 15); // Runs late
```

## Plugin Directory Structure

```
plugins/
├── seo/                    # SEO optimization
├── comments/               # Comment system
├── contact-form/           # Contact forms
├── analytics/              # Page view tracking
├── social-sharing/         # Social media sharing
├── two-factor-auth/        # Two-factor authentication
├── password-reset/         # Password reset flow
├── products/               # Product management
├── cart/                   # Shopping cart
├── checkout/               # Checkout flow
├── orders/                 # Order management
├── coupons/                # Discount codes
├── payment-gateways/       # Payment processing
├── shipping/               # Shipping zones
├── tax-rates/              # Tax calculation
├── email-templates/        # Email templates
├── pdf-invoices/           # Invoice generation
└── subscriptions/          # Subscription management
```

## Testing Your Plugin

1. Place plugin in `plugins/your-plugin/`
2. Run `pnpm install` to link dependencies
3. Run `pnpm dev` to start the server
4. Check console for `[PluginLoader] Found plugin: your-plugin`
5. Test hooks by triggering the relevant actions

## Best Practices

1. **Keep plugins focused** — One plugin, one responsibility
2. **Use hooks, not direct imports** — Don't import from other features
3. **Validate inputs** — Use Zod for any external data
4. **Handle errors gracefully** — Don't let plugin errors crash the server
5. **Document your hooks** — List all hooks your plugin provides
6. **Version your plugins** — Use semantic versioning

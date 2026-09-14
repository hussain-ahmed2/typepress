# Plugin Development Guide

## Overview
Typepress plugins extend the system's functionality through hooks, routes, and content types. Plugins are self-contained packages in the `plugins/` directory.

## Plugin Structure
```
plugins/my-plugin/
├── typepress.plugin.json    # Manifest
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
└── src/
    └── index.ts             # Plugin entry point
```

## Plugin Manifest
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

  register(api) {
    // Register hooks
    api.hooks.on('content:after_create', async (...args) => {
      const content = args[0] as Record<string, unknown>;
      console.log('New content:', content.title);
    });

    // Register filters
    api.register_filter<string>('content:render_title', (title) => {
      return title.toUpperCase();
    });
  },
});
```

## Available Hooks
- `content:before_create` — Before content is created
- `content:after_create` — After content is created
- `content:before_update` — Before content is updated
- `content:after_update` — After content is updated
- `content:before_delete` — Before content is deleted
- `content:after_fetch` — After content is fetched
- `plugin:loaded` — After a plugin is loaded

## Available Filters
- `content:render_title` — Transform content title
- `content:render_excerpt` — Transform content excerpt

## Plugin API
The `api` object provides:
- `hooks.on(name, handler, priority)` — Register hook
- `hooks.emit(name, ...args)` — Emit hook
- `hooks.register_filter(name, handler, priority)` — Register filter
- `hooks.apply_filters(name, value, ...args)` — Apply filter

## Testing Your Plugin
1. Place plugin in `plugins/my-plugin/`
2. Run `pnpm dev`
3. Check console for `[PluginLoader] Found plugin: my-plugin`
4. Test hooks by triggering the relevant actions

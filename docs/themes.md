# Theme Development Guide

## Overview
Typepress themes are React component packages that define the visual layout of the public site. Each theme implements a set of "slots" — header, footer, post list, single post, and optional sidebar.

## Theme Structure
```
themes/my-theme/
├── typepress.theme.json     # Manifest
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
└── src/
    └── index.tsx            # Theme entry point
```

## Theme Manifest
```json
{
  "name": "my-theme",
  "version": "1.0.0",
  "description": "My awesome theme",
  "slots": ["header", "footer", "post_list", "single_post", "sidebar"],
  "author": "Your Name"
}
```

## Theme Entry Point
```tsx
import { define_theme, type SlotProps } from '@typepress/theme-sdk';

function Header({ site_title }: SlotProps) {
  return (
    <header>
      <h1>{site_title}</h1>
    </header>
  );
}

function Footer({ site_title }: SlotProps) {
  return (
    <footer>
      <p>© {new Date().getFullYear()} {site_title}</p>
    </footer>
  );
}

function PostList({ contents }: SlotProps) {
  return (
    <div>
      {contents?.map((item) => (
        <article key={item.id}>
          <a href={`/${item.slug}`}>{item.title}</a>
        </article>
      ))}
    </div>
  );
}

function SinglePost({ content, taxonomies }: SlotProps) {
  if (!content) return null;
  return (
    <article>
      <h1>{content.title}</h1>
      <p>{content.meta?.excerpt}</p>
    </article>
  );
}

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

## Required Slots
- `header` — Site header with navigation
- `footer` — Site footer
- `post_list` — List of content items
- `single_post` — Single content view

## Optional Slots
- `sidebar` — Sidebar widget area

## Slot Props
All slots receive:
```typescript
interface SlotProps {
  content?: ContentDetail;      // Current content (single post view)
  contents?: ContentListItem[]; // Content list (list view)
  taxonomies?: TaxonomyBrief[]; // Associated taxonomies
  site_title: string;           // Site title
  site_description: string;     // Site description
}
```

## Testing Your Theme
1. Place theme in `themes/my-theme/`
2. Run `pnpm dev`
3. Visit the renderer app
4. Check that all slots render correctly

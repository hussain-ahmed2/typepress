# Theme Development Guide

## Overview

Typepress themes are React component packages that define the visual layout of the public site. Each theme implements a set of "slots" — header, footer, post list, single post, and optional sidebar.

## Theme Structure

```
themes/my-theme/
├── typepress.theme.json     # Manifest (required)
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
└── src/
    └── index.tsx            # Theme entry point
```

## Theme Manifest

Every theme must have a `typepress.theme.json` file:

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
      {taxonomies?.map((t) => (
        <span key={t.id}>{t.name}</span>
      ))}
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

| Slot | Props | Description |
|---|---|---|
| `header` | site_title, site_description | Site header with navigation |
| `footer` | site_title, site_description | Site footer |
| `post_list` | contents, site_title | List of content items |
| `single_post` | content, taxonomies | Single content view |

## Optional Slots

| Slot | Props | Description |
|---|---|---|
| `sidebar` | site_title, site_description | Sidebar widget area |

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

## Content Types

```typescript
interface ContentListItem {
  id: string;
  type: string;
  slug: string;
  title: string;
  status: string;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

interface ContentDetail extends ContentListItem {
  meta: Record<string, unknown>;
  taxonomies: TaxonomyBrief[];
}

interface TaxonomyBrief {
  id: string;
  name: string;
  slug: string;
  type: string;
}
```

## Available Themes

| Theme | Description |
|---|---|
| Default | Clean, minimal blog layout |
| Business | Professional with sidebar |
| Blog | Blog with sidebar layout |
| Portfolio | Creative masonry grid |
| E-commerce | Online store with product grid |
| Magazine | Magazine-style with featured content |
| Landing | Landing page with hero section |

## Theme Directory Structure

```
themes/
├── default/           # Clean, minimal
├── business/          # Professional with sidebar
├── blog/              # Blog with sidebar
├── portfolio/         # Creative portfolio
├── ecommerce/         # Online store
├── magazine/          # Magazine-style
└── landing/           # Landing page
```

## Testing Your Theme

1. Place theme in `themes/your-theme/`
2. Run `pnpm install` to link dependencies
3. Run `pnpm dev` to start the server
4. Visit the renderer app
5. Check that all slots render correctly

## Best Practices

1. **Keep slots focused** — Each slot should render one thing
2. **Use Tailwind CSS** — Consistent styling with utility classes
3. **Responsive design** — Support mobile, tablet, and desktop
4. **Accessible** — Use semantic HTML and ARIA attributes
5. **Performance** — Lazy load images, minimize JavaScript
6. **SEO** — Use proper heading hierarchy, meta tags

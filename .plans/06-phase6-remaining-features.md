# Phase 6: WordPress Feature Parity — Remaining Features

## Goal
Close the remaining 30% gap with WordPress by adding the most impactful missing features.

---

## Priority 1: High-Impact Features

### 1. Scheduled Posts
- Add `publish_at` field to Content model
- Background job to publish scheduled content
- Admin UI: date/time picker in editor
- Cron job to check and publish

### 2. Image Editing
- Server-side image processing (Sharp library)
- Crop, resize, rotate, flip
- Apply filters (grayscale, sepia, blur)
- Generate thumbnails on upload
- Image transforms endpoint

### 3. Two-Factor Authentication
- TOTP (Google Authenticator compatible)
- QR code generation for setup
- Backup codes
- 2FA settings page in admin

### 4. Password-Protected Posts
- Add `password` field to Content model
- Password prompt on public renderer
- Encrypted password storage

### 5. Sticky Posts
- Add `is_sticky` boolean to Content
- Sticky posts appear first in lists
- Visual indicator in admin

### 6. Post Formats
- Add `format` enum to Content (standard, video, gallery, quote, aside, link, image)
- Theme-aware rendering per format
- Format selector in editor

---

## Priority 2: Nice-to-Have Features

### 7. RSS Feeds
- Generate RSS 2.0 feeds per content type
- `/feed/rss.xml`, `/feed/rss2.xml`, `/feed/atom.xml`
- Include excerpts, categories, author info

### 8. XML Sitemaps
- Generate sitemap.xml for search engines
- Include all published content
- Auto-update on publish
- `/sitemap.xml` endpoint

### 9. Cron Jobs / Task Scheduling
- Redis-backed job queue
- Scheduled task execution
- Recurring tasks (backups, cache warming)
- Admin UI for managing scheduled tasks

### 10. Export/Import
- Export content as JSON
- Import from WordPress XML format
- Import from JSON format
- Selective import (content, media, taxonomies)

### 11. Child Themes
- Theme inheritance (parent → child)
- Override specific slots
- Share parent's base styles
- Child theme manifest

### 12. Widget System
- Sidebar widgets (recent posts, categories, search, custom HTML)
- Widget areas defined by themes
- Drag-and-drop widget ordering
- Widget settings in admin

### 13. Breadcrumbs
- Automatic breadcrumb generation
- Schema.org structured data
- Configurable separator
- Theme-aware rendering

### 14. Related Posts
- Algorithm: same taxonomy + content type
- Configurable number of related posts
- Cache related post queries
- Display in single post view

### 15. Social Sharing
- Share buttons (Twitter, Facebook, LinkedIn, etc.)
- Open Graph meta tags (SEO plugin extension)
- Share counts (optional)

### 16. Email Notifications
- Notify admin on new comments
- Notify author on publish
- Notify on user registration
- Configurable email templates

### 17. Application Passwords
- Generate per-app passwords
- API authentication via Basic Auth
- Revoke application passwords
- Admin UI for managing app passwords

### 18. Internationalization (i18n)
- Translation file system (.po/.mo)
- RTL language support
- Date/time/number formatting
- Admin UI translations

---

## Implementation Order

### Batch 1 (Most Impactful)
1. Scheduled posts + cron jobs
2. Image editing (Sharp)
3. Two-factor authentication
4. Password-protected posts

### Batch 2 (Content Features)
5. Sticky posts
6. Post formats
7. RSS feeds
8. XML sitemaps

### Batch 3 (Advanced)
9. Export/import
10. Child themes
11. Widget system
12. Breadcrumbs
13. Related posts

### Batch 4 (Polish)
14. Social sharing
15. Email notifications
16. Application passwords
17. Internationalization

---

## New Dependencies
- sharp (image processing)
- speakeasy (TOTP 2FA)
- qrcode (QR code generation)
- node-cron (scheduled tasks)
- rss (RSS feed generation)
- sitemap (XML sitemap generation)

---

## Verification
1. `pnpm build` — all packages compile
2. `pnpm test:run` — all tests pass
3. Scheduled posts publish at指定时间
4. Image upload creates thumbnails
5. 2FA setup works with Google Authenticator
6. Password-protected posts show password prompt
7. Sticky posts appear first in lists
8. RSS feeds validate
9. Sitemap includes all published content
10. WordPress XML import works

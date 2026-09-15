# API Reference

## Base URL

```
http://localhost:8000
```

## Authentication

All protected endpoints require a session cookie. Login via `POST /api/auth/login`.

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@typepress.dev","password":"test"}' \
  -c cookies.txt

# Use cookie for protected endpoints
curl -b cookies.txt http://localhost:8000/api/content
```

## Response Format

All API responses follow a consistent shape:

```json
{
  "success": true,
  "data": {},
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

## Rate Limits

| Endpoint | Limit | Window |
|---|---|---|
| Global | 100 requests | 1 minute |
| Auth | 5 attempts | 1 minute |
| Search | 30 requests | 1 minute |

---

## Auth Endpoints

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user_id": "clx...",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "AUTHOR"
  }
}
```

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "new@example.com",
  "name": "New User",
  "password": "SecurePass123"
}
```

### Logout
```http
POST /api/auth/logout
```

### Get Current User
```http
GET /api/auth/me
```

---

## Content Endpoints

### List Content
```http
GET /api/content?page=1&limit=20&type=post&status=PUBLISHED
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max 100) |
| type | string | — | Filter by content type |
| status | string | — | Filter by status |
| sort | string | created_at | Sort field |
| order | string | desc | Sort direction |

### Get Content by ID
```http
GET /api/content/:id
```

### Get Content by Slug
```http
GET /api/content/slug/:slug
```

### Create Content
```http
POST /api/content
Content-Type: application/json

{
  "type": "post",
  "slug": "my-first-post",
  "title": "My First Post",
  "status": "DRAFT",
  "meta": {
    "excerpt": "This is my first post"
  },
  "taxonomy_ids": ["cat_1", "tag_1"],
  "published_at": "2024-01-15T10:00:00Z",
  "is_sticky": false,
  "format": "standard"
}
```

### Update Content
```http
PUT /api/content/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "PUBLISHED"
}
```

### Delete Content (Soft Delete)
```http
DELETE /api/content/:id
```

---

## Media Endpoints

### List Media
```http
GET /api/media?page=1&limit=20
```

### Upload Media
```http
POST /api/media/upload
Content-Type: application/json

{
  "filename": "photo.jpg",
  "mimetype": "image/jpeg",
  "size": 1024000,
  "url": "https://example.com/photo.jpg"
}
```

### Delete Media
```http
DELETE /api/media/:id
```

---

## Taxonomy Endpoints

### List Taxonomies
```http
GET /api/taxonomy?type=category
```

### Get Taxonomy
```http
GET /api/taxonomy/:id
```

### Create Taxonomy
```http
POST /api/taxonomy
Content-Type: application/json

{
  "name": "Technology",
  "slug": "technology",
  "type": "category"
}
```

### Update Taxonomy
```http
PUT /api/taxonomy/:id
Content-Type: application/json

{
  "name": "Updated Name"
}
```

### Delete Taxonomy
```http
DELETE /api/taxonomy/:id
```

---

## Menu Endpoints

### List Menus
```http
GET /api/menus
```

### Get Menu
```http
GET /api/menus/:id
```

### Create Menu
```http
POST /api/menus
Content-Type: application/json

{
  "name": "Main Navigation",
  "slug": "main-nav",
  "location": "primary"
}
```

### Update Menu
```http
PUT /api/menus/:id
Content-Type: application/json

{
  "name": "Updated Navigation"
}
```

### Delete Menu
```http
DELETE /api/menus/:id
```

### Add Menu Item
```http
POST /api/menus/:id/items
Content-Type: application/json

{
  "label": "Home",
  "url": "/",
  "target": "_self",
  "order": 0
}
```

### Delete Menu Item
```http
DELETE /api/menus/items/:id
```

---

## User Endpoints (Admin Only)

### List Users
```http
GET /api/users?page=1&limit=20&role=ADMIN
```

### Get User
```http
GET /api/users/:id
```

### Update User
```http
PUT /api/users/:id
Content-Type: application/json

{
  "role": "EDITOR",
  "name": "Updated Name"
}
```

### Delete User
```http
DELETE /api/users/:id
```

---

## Revision Endpoints

### List Revisions
```http
GET /api/content/:id/revisions
```

### Restore Revision
```http
POST /api/content/:id/revisions/:revision_id/restore
```

---

## Search Endpoint

### Search Content
```http
GET /api/search?q=typescript&type=post&limit=10
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| q | string | Yes | Search query |
| type | string | No | Filter by content type |
| limit | number | No | Results limit (default 20) |

---

## Export/Import Endpoints

### Export All Content
```http
GET /api/export
```

Downloads a JSON file with all content and taxonomies.

### Import Content
```http
POST /api/import
Content-Type: application/json

{
  "version": "1.0.0",
  "exported_at": "2024-01-15T10:00:00Z",
  "content": [...],
  "taxonomies": [...]
}
```

---

## GraphQL Endpoint

### Endpoint
```http
POST /api/graphql
```

### Playground
```
GET /api/graphql
```

### Example Query
```graphql
query {
  contents(type: "post", status: PUBLISHED, limit: 10) {
    items {
      id
      title
      slug
      status
      author {
        name
      }
    }
    total
    page
  }
}
```

### Example Mutation
```graphql
mutation {
  createContent(input: {
    type: "post"
    slug: "my-post"
    title: "My Post"
    status: DRAFT
  }) {
    id
    title
    slug
  }
}
```

---

## WebSocket (Real-time)

### Connection
```javascript
const socket = io('http://localhost:8000');
```

### Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| join:editing | Client → Server | { content_id, user_id, user_name } | Join editing room |
| presence:update | Server → Client | User[] | Updated presence list |
| cursor:move | Client → Server | { content_id, position } | Send cursor position |
| cursor:update | Server → Client | { user_id, position, color } | Receive cursor update |
| content:change | Client → Server | { content_id, delta } | Send content change |
| content:sync | Server → Client | { content_id, delta } | Receive content change |

---

## Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00Z",
  "uptime": 12345.678,
  "plugins": ["seo@1.0.0", "comments@1.0.0"],
  "features": ["auth", "content", "media", "taxonomy", "menus", "users", "revisions", "search"]
}
```

---

## RSS Feeds

### All Content
```http
GET /feed
```

### By Type
```http
GET /feed/post
```

---

## Sitemap

```http
GET /sitemap.xml
```

---

## Error Codes

| Code | Description |
|---|---|
| VALIDATION_ERROR | Request validation failed |
| UNAUTHORIZED | Authentication required |
| FORBIDDEN | Insufficient permissions |
| NOT_FOUND | Resource not found |
| CONFLICT | Resource already exists |
| RATE_LIMITED | Too many requests |
| ACCOUNT_LOCKED | Account locked due to failed attempts |
| INVALID_CREDENTIALS | Wrong email or password |
| WEAK_PASSWORD | Password doesn't meet requirements |
| INTERNAL_ERROR | Server error |

# API Documentation

## Base URL
```
http://localhost:8000
```

## Authentication
All protected endpoints require a session cookie. Login via `POST /api/auth/login`.

## Endpoints

### Health
```
GET /health
```
Returns server status, uptime, loaded plugins, and features.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/login | Login with email/password |
| POST | /api/auth/logout | Destroy session |
| GET | /api/auth/me | Get current user |

### Content
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/content | No | List content with pagination |
| GET | /api/content/:id | No | Get content by ID |
| GET | /api/content/slug/:slug | No | Get content by slug |
| POST | /api/content | Yes | Create content |
| PUT | /api/content/:id | Yes | Update content |
| DELETE | /api/content/:id | Yes | Move to trash |

### Media
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/media | No | List media |
| POST | /api/media/upload | Yes | Upload media |
| DELETE | /api/media/:id | Yes | Delete media |

### Taxonomy
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/taxonomy | No | List taxonomies |
| GET | /api/taxonomy/:id | No | Get taxonomy |
| POST | /api/taxonomy | Yes | Create taxonomy |
| PUT | /api/taxonomy/:id | Yes | Update taxonomy |
| DELETE | /api/taxonomy/:id | Yes | Delete taxonomy |

### Menus
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/menus | No | List menus |
| GET | /api/menus/:id | No | Get menu with items |
| POST | /api/menus | Yes | Create menu |
| PUT | /api/menus/:id | Yes | Update menu |
| DELETE | /api/menus/:id | Yes | Delete menu |
| POST | /api/menus/:id/items | Yes | Add menu item |
| DELETE | /api/menus/items/:id | Yes | Delete menu item |

### Users
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/users | Yes | List users |
| GET | /api/users/:id | Yes | Get user |
| PUT | /api/users/:id | Yes | Update user |
| DELETE | /api/users/:id | Yes | Delete user |

### Revisions
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/content/:id/revisions | Yes | List revisions |
| POST | /api/content/:id/revisions/:rid/restore | Yes | Restore revision |

### Search
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/search?q=query&type=post | Full-text search |

### GraphQL
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/graphql | GraphQL endpoint |
| GET | /api/graphql | GraphiQL playground |

### WebSocket
| Path | Description |
|---|---|
| /socket.io | Real-time collaboration |

## Response Format
All API responses follow:
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
- Global: 100 requests/minute
- Auth: 5 attempts/minute
- Search: 30 requests/minute

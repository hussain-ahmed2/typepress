# Security Guide

## Overview

Typepress implements multiple security layers to protect against common web vulnerabilities.

## Security Features

### 1. Password Security

**bcrypt Hashing**
- Cost factor: 12 (recommended minimum)
- Automatic salt generation
- Constant-time comparison

**Password Requirements**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number

```typescript
// Password validation in auth service
const result = service.validate_password_strength(password);
if (!result.valid) {
  return { success: false, error: result.error };
}
```

### 2. Session Security

**Secure Cookies**
```typescript
await app.register(session, {
  secret: config.SESSION_SECRET,
  cookie: {
    secure: true,      // HTTPS only in production
    httpOnly: true,    // No JavaScript access
    sameSite: 'lax',   // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});
```

**Session Regeneration**
- Session ID regenerated on login (prevents session fixation)
- Session destroyed on logout

### 3. Rate Limiting

```typescript
// Global: 100 requests/minute
// Auth: 5 attempts/minute
// Search: 30 requests/minute
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});
```

### 4. Account Lockout

- 5 failed login attempts → account locked
- 15-minute lockout duration
- Automatic unlock after timeout

```typescript
// In auth service
if (this.is_account_locked(email)) {
  return { error: 'ACCOUNT_LOCKED', message: 'Try again in 15 minutes' };
}
```

### 5. Security Headers (Helmet)

```typescript
await app.register(helmet, {
  contentSecurityPolicy: false, // Configure per-app
  crossOriginEmbedderPolicy: false,
});
```

Headers included:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security (HSTS)
- Referrer-Policy

### 6. Input Validation

All inputs validated with Zod schemas:

```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const result = schema.safeParse(input);
if (!result.success) {
  return reply.status(400).send({ error: 'VALIDATION_ERROR' });
}
```

### 7. CORS Configuration

```typescript
await app.register(cors, {
  origin: config.ADMIN_URL, // Only admin origin
  credentials: true,
});
```

## Security Checklist

### Authentication
- [x] Password hashing with bcrypt (cost 12)
- [x] Session regeneration on login
- [x] Account lockout after failed attempts
- [x] Password complexity validation
- [x] Secure cookie flags

### Authorization
- [x] Capability-based permissions
- [x] Role-based access control
- [x] Admin-only endpoints protected

### Input Validation
- [x] Zod schemas on all inputs
- [x] Request size limits
- [x] SQL injection prevention (Prisma)

### Transport Security
- [x] HTTPS in production
- [x] HSTS headers
- [x] CORS configured

### Rate Limiting
- [x] Global rate limit
- [x] Auth-specific rate limit
- [x] Search rate limit

## Production Recommendations

### Environment Variables

```env
# Use strong, unique secrets
SESSION_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)

# Enable HTTPS
COOKIE_SECURE=true

# Restrict CORS
ADMIN_URL=https://admin.yourdomain.com
```

### Docker Security

```yaml
services:
  api:
    environment:
      NODE_ENV: production
      COOKIE_SECURE: "true"
    # Don't expose unnecessary ports
    # Use read-only filesystem where possible
```

### Database Security

```bash
# Use strong passwords
# Limit database user permissions
# Enable SSL for connections
# Regular backups
```

## Common Vulnerabilities Prevented

| Vulnerability | Prevention |
|---|---|
| SQL Injection | Prisma parameterized queries |
| XSS | Input validation, CSP headers |
| CSRF | SameSite cookies, CORS |
| Brute Force | Rate limiting, account lockout |
| Session Fixation | Session regeneration on login |
| Password Cracking | bcrypt with cost factor 12 |
| Man-in-the-Middle | HTTPS, HSTS |
| Clickjacking | X-Frame-Options: DENY |

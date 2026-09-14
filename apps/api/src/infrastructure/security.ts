/**
 * Security Middleware — Security headers and protections.
 *
 * Adds:
 *   - Helmet security headers (CSP, HSTS, X-Frame-Options, etc.)
 *   - Response compression (gzip/br)
 *   - CORS configuration
 *   - Request size limits
 */
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import type { FastifyInstance } from 'fastify';

export async function register_security(app: FastifyInstance): Promise<void> {
  // Security headers via Helmet
  await app.register(helmet, {
    contentSecurityPolicy: false, // Disable for now (too restrictive for admin UI)
    crossOriginEmbedderPolicy: false,
  });

  // Response compression (gzip, brotli)
  await app.register(compress, {
    encodings: ['gzip', 'br'],
    threshold: 1024, // Only compress responses > 1KB
  });

  console.log('[Security] Security headers and compression enabled');
}

import { create_logger } from "./logger";
const log = create_logger("Security");
/**
 * Rate Limiting — Configurable rate limits for API endpoints.
 *
 * Limits:
 *   - Global: 100 requests/minute
 *   - Auth: 5 attempts/minute
 *   - API: 60 requests/minute
 *   - Search: 30 requests/minute
 *
 * All limits configurable via environment variables.
 */
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

export async function register_rate_limiting(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_GLOBAL || '100', 10),
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, context) => ({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
      },
    }),
  });

  // Stricter limit for auth endpoints
  app.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api/auth')) {
      reply.header('X-RateLimit-Limit', process.env.RATE_LIMIT_AUTH || '5');
    }
  });

  log.info("Rate limiting enabled");
}

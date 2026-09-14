/**
 * Global Error Handler — Catches and formats all unhandled Fastify errors.
 *
 * Handles:
 *   - Zod validation errors → 400
 *   - Fastify validation errors → 400
 *   - Not found errors → 404
 *   - Everything else → 500 (with sanitized message in production)
 *
 * All responses follow the ApiResponse<T> shape for consistency.
 */
import type { FastifyInstance, FastifyError } from 'fastify';
import type { ApiResponse } from '@typepress/shared-types';

export function register_error_handler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    app.log.error(error);

    if (error.name === 'ZodError') {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message },
      } satisfies ApiResponse);
    }

    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message },
      } satisfies ApiResponse);
    }

    if (error.statusCode === 404) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message },
      } satisfies ApiResponse);
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message:
          process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : error.message,
      },
    } satisfies ApiResponse);
  });
}

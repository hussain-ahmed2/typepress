/**
 * Validation Middleware — Zod-based request validation for Fastify.
 *
 * Validates request body, query parameters, or path parameters against
 * Zod schemas before handlers execute. On failure, returns structured
 * 400 errors with field-level details.
 *
 * Usage in routes:
 *   app.post('/content', {
 *     preHandler: [validate_body(create_content_schema)],
 *   }, handler);
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ZodSchema, ZodError } from 'zod';

/** Convert Zod errors into a human-readable array of field/message pairs. */
function format_zod_error(error: ZodError) {
  return error.errors.map((e) => ({
    field: e.path.join('.'),
    message: e.message,
  }));
}

/**
 * Creates a preHandler that validates request.body against a Zod schema.
 * On success, replaces body with the parsed/coerced value.
 * On failure, returns 400 with validation error details.
 */
export function validate_body(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body validation failed',
          details: format_zod_error(result.error),
        },
      });
    }

    request.body = result.data;
  };
}

/**
 * Creates a preHandler that validates request.query against a Zod schema.
 * Useful for pagination, filtering, and sort parameters.
 */
export function validate_query(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.query);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query parameter validation failed',
          details: format_zod_error(result.error),
        },
      });
    }

    request.query = result.data;
  };
}

/**
 * Creates a preHandler that validates request.params against a Zod schema.
 * Useful for validating :id, :slug, and other path parameters.
 */
export function validate_params(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.params);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Path parameter validation failed',
          details: format_zod_error(result.error),
        },
      });
    }

    request.params = result.data;
  };
}

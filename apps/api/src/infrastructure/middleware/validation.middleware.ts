/**
 * Validation Middleware — Zod v4-based request validation for Fastify.
 *
 * Validates request body, query parameters, or path parameters against
 * Zod schemas before handlers execute. On failure, returns structured
 * 400 errors with field-level details.
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ZodSchema } from 'zod';

/** Convert Zod v4 errors into a human-readable array of field/message pairs. */
function format_zod_error(error: unknown) {
  const zod_error = error as { issues?: Array<{ path: (string | number)[]; message: string }> };
  if (!zod_error.issues) return [];
  return zod_error.issues.map((e) => ({
    field: e.path.join('.'),
    message: e.message,
  }));
}

/**
 * Creates a preHandler that validates request.body against a Zod schema.
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

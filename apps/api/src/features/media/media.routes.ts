/**
 * Media Routes — HTTP handlers for media management.
 *
 * Upload accepts multipart/form-data with a single "file" field.
 * Files are validated, optionally processed (images via Sharp), stored through the
 * configured storage adapter, and persisted as media records.
 */
import multipart from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';
import { require_auth, require_capability, validate_query } from '../../infrastructure/middleware';
import { MAX_UPLOAD_BYTES, MediaService } from './media.service';
import { list_media_schema } from './media.validators';
import type { AuthenticatedRequest } from '../../infrastructure/middleware';
import '../../types';

interface MediaRouteDependencies {
  media_service: MediaService;
}

export async function media_routes(app: FastifyInstance) {
  await register_media_routes(app);
}

/** Register media routes with optional dependency injection for testing. */
export async function register_media_routes(
  app: FastifyInstance,
  dependencies?: Partial<MediaRouteDependencies>,
) {
  const media_service = dependencies?.media_service ?? new MediaService();

  await app.register(multipart, {
    limits: {
      fileSize: MAX_UPLOAD_BYTES,
      files: 1,
    },
  });

  /** GET / — List media with pagination */
  app.get('/', {
    preHandler: [validate_query(list_media_schema)],
  }, async (request, reply) => {
    const result = await media_service.list(request.query as never);
    return reply.send(result);
  });

  /** POST /upload — Upload a file (multipart/form-data, field: "file") */
  app.post('/upload', {
    preHandler: [require_auth, require_capability('media:upload')],
  }, async (request, reply) => {
    const user_id = (request as AuthenticatedRequest).user_id;
    const file = await request.file();

    if (!file) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_FILE', message: 'Multipart file field "file" is required' },
      });
    }

    if (file.fieldname !== 'file') {
      // Drain unexpected part to free stream.
      file.file.resume();
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_FILE', message: 'Expected file field named "file"' },
      });
    }

    const buffer = await file.toBuffer();
    if (file.file.truncated) {
      return reply.status(413).send({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File exceeds maximum size of ${MAX_UPLOAD_BYTES} bytes`,
        },
      });
    }

    const result = await media_service.upload_file(
      {
        filename: file.filename,
        mimetype: file.mimetype,
        buffer,
      },
      user_id,
    );

    if (!result.success) {
      const status = get_upload_error_status(result.error?.code);
      return reply.status(status).send(result);
    }

    return reply.status(201).send(result);
  });

  /** DELETE /:id — Delete a media item and stored object (requires media:delete) */
  app.delete('/:id', {
    preHandler: [require_auth, require_capability('media:delete')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await media_service.delete(id);

    if (!result.success) {
      const status = result.error?.code === 'NOT_FOUND' ? 404 : 500;
      return reply.status(status).send(result);
    }

    return reply.send(result);
  });
}

function get_upload_error_status(code: string | undefined): number {
  switch (code) {
    case 'UNSUPPORTED_FILE_TYPE':
    case 'INVALID_FILE_TYPE':
    case 'INVALID_FILE':
    case 'INVALID_IMAGE':
      return 400;
    case 'FILE_TOO_LARGE':
      return 413;
    default:
      return 500;
  }
}

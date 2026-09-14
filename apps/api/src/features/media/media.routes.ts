/**
 * Media Routes — HTTP handlers for media management.
 *
 * Upload accepts JSON metadata for now.
 * When @fastify/multipart is added, this will handle file uploads.
 * All write operations require authentication.
 */
import type { FastifyInstance } from 'fastify';
import { validate_query, validate_body, require_auth } from '../../infrastructure/middleware';
import { list_media_schema, upload_media_schema } from './media.validators';
import { MediaService } from './media.service';
import type { AuthenticatedRequest } from '../../infrastructure/middleware';
import '../../types';

const media_service = new MediaService();

export async function media_routes(app: FastifyInstance) {
  /** GET / — List media with pagination */
  app.get('/', {
    preHandler: [validate_query(list_media_schema)],
  }, async (request, reply) => {
    const result = await media_service.list(request.query as never);
    return reply.send(result);
  });

  /** POST /upload — Upload media metadata (file upload coming with MinIO) */
  app.post('/upload', {
    preHandler: [require_auth, validate_body(upload_media_schema)],
  }, async (request, reply) => {
    const user_id = (request as AuthenticatedRequest).user_id;
    const { filename, mimetype, size, url } = request.body as {
      filename: string;
      mimetype: string;
      size: number;
      url: string;
    };

    const result = await media_service.create(filename, mimetype, size, url, user_id);
    return reply.status(201).send(result);
  });

  /** DELETE /:id — Delete a media item */
  app.delete('/:id', {
    preHandler: [require_auth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await media_service.delete(id);

    if (!result.success) {
      return reply.status(404).send(result);
    }

    return reply.send(result);
  });
}

/**
 * Media Service — Business logic for media upload and management.
 *
 * Handles listing, creating, and deleting media records.
 * File storage is abstracted — currently uses placeholder URLs,
 * will be swapped to MinIO/S3 when infrastructure is ready.
 */
import { prisma } from '@typepress/db';
import type { ApiResponse, PaginatedResponse } from '@typepress/shared-types';
import type { ListMediaQuery } from './media.validators';

interface MediaItem {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  uploader_id: string;
  created_at: Date;
}

export class MediaService {
  /** List media with pagination, ordered by newest first. */
  async list(query: ListMediaQuery): Promise<PaginatedResponse<MediaItem>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.media.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.media.count(),
    ]);

    return {
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /** Create a media record after file upload. */
  async create(
    filename: string,
    mimetype: string,
    size: number,
    url: string,
    uploader_id: string,
  ): Promise<ApiResponse> {
    const media = await prisma.media.create({
      data: { filename, mimetype, size, url, uploader_id },
    });

    return { success: true, data: media };
  }

  /** Delete a media record. TODO: Also delete the file from storage. */
  async delete(id: string): Promise<ApiResponse> {
    const existing = await prisma.media.findUnique({ where: { id } });
    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Media not found' },
      };
    }

    await prisma.media.delete({ where: { id } });
    return { success: true, data: { message: 'Media deleted' } };
  }
}

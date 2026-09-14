/**
 * Media Validators — Zod schemas for media endpoint validation.
 */
import { z } from 'zod';

export const list_media_schema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const upload_media_schema = z.object({
  filename: z.string().min(1),
  mimetype: z.string().min(1),
  size: z.number().int().positive(),
  url: z.string().url(),
});

export type ListMediaQuery = z.infer<typeof list_media_schema>;
export type UploadMediaInput = z.infer<typeof upload_media_schema>;

/**
 * Comment Validators — Zod schemas for comment API inputs.
 */
import { z } from 'zod';

export const comment_status_schema = z.enum(['PENDING', 'APPROVED', 'SPAM', 'TRASH']);

export const create_comment_schema = z.object({
  content_id: z.string().min(1),
  author_name: z.string().trim().min(1).max(120).optional(),
  author_email: z.string().trim().email().max(254).optional(),
  body: z.string().trim().min(1).max(5000),
  parent_id: z.string().min(1).nullable().optional(),
});

export const moderate_comment_schema = z.object({
  status: comment_status_schema,
});

export const list_comments_schema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: comment_status_schema.optional(),
  content_id: z.string().min(1).optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

export type CreateCommentInput = z.infer<typeof create_comment_schema>;
export type ModerateCommentInput = z.infer<typeof moderate_comment_schema>;
export type ListCommentsQuery = z.infer<typeof list_comments_schema>;

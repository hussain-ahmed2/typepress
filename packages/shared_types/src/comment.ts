/** Comment shared types used by API and admin. */

export type CommentStatus = 'PENDING' | 'APPROVED' | 'SPAM' | 'TRASH';

export interface CommentAuthor {
  id: string | null;
  name: string | null;
  email: string | null;
}

export interface CommentItem {
  id: string;
  content_id: string;
  content_title?: string;
  user_id: string | null;
  author_name: string | null;
  author_email: string | null;
  body: string;
  status: CommentStatus;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentInput {
  content_id: string;
  author_name?: string;
  author_email?: string;
  body: string;
  parent_id?: string | null;
}

export interface ModerateCommentInput {
  status: CommentStatus;
}

export interface CommentListQuery {
  page?: number;
  limit?: number;
  status?: CommentStatus;
  content_id?: string;
  search?: string;
}

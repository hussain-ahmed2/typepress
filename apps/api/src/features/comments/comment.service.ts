/**
 * Comment Service — Business logic for comment CRUD and moderation.
 *
 * Public users can create comments (subject to validation/rate limiting at route layer).
 * Moderation and deletion require comment:moderate capability.
 */
import { randomUUID } from 'node:crypto';
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { comments, contents, db, users } from '@typepress/db';
import type { ApiResponse, PaginatedResponse } from '@typepress/shared-types';
import type { CommentStatus } from '@typepress/shared-types';
import type { CreateCommentInput, ListCommentsQuery, ModerateCommentInput } from './comment.validators';

interface CommentListItem {
  id: string;
  content_id: string;
  content_title: string | null;
  user_id: string | null;
  author_name: string | null;
  author_email: string | null;
  body: string;
  status: CommentStatus;
  parent_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface CreateCommentActor {
  user_id?: string;
}

/** Shape returned by comment queries joined with content title. */
interface CommentWithContentTitle {
  id: string;
  content_id: string;
  content_title: string | null;
  user_id: string | null;
  author_name: string | null;
  author_email: string | null;
  body: string;
  status: CommentStatus;
  parent_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export class CommentService {
  /** Map a joined row to the API comment shape. */
  private to_comment_item(row: CommentWithContentTitle): CommentListItem {
    return {
      id: row.id,
      content_id: row.content_id,
      content_title: row.content_title,
      user_id: row.user_id,
      author_name: row.author_name,
      author_email: row.author_email,
      body: row.body,
      status: row.status,
      parent_id: row.parent_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /** Build Drizzle WHERE conditions for comment listing filters. */
  private build_list_where(query: ListCommentsQuery): SQL | undefined {
    const conditions: SQL[] = [];
    if (query.status) conditions.push(eq(comments.status, query.status));
    if (query.content_id) conditions.push(eq(comments.content_id, query.content_id));
    if (query.search) {
      const pattern = `%${query.search}%`;
      const search_condition = or(
        ilike(comments.body, pattern),
        ilike(comments.author_name, pattern),
        ilike(comments.author_email, pattern),
      );
      if (search_condition) conditions.push(search_condition);
    }
    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /** List comments with pagination and optional filters. */
  async list(query: ListCommentsQuery): Promise<PaginatedResponse<CommentListItem>> {
    const { page, limit } = query;
    const offset = (page - 1) * limit;
    const where = this.build_list_where(query);

    const [items, count_rows] = await Promise.all([
      db
        .select({
          id: comments.id,
          content_id: comments.content_id,
          content_title: contents.title,
          user_id: comments.user_id,
          author_name: comments.author_name,
          author_email: comments.author_email,
          body: comments.body,
          status: comments.status,
          parent_id: comments.parent_id,
          created_at: comments.created_at,
          updated_at: comments.updated_at,
        })
        .from(comments)
        .innerJoin(contents, eq(comments.content_id, contents.id))
        .where(where)
        .orderBy(desc(comments.created_at))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(comments)
        .where(where),
    ]);

    const total = Number(count_rows[0]?.total ?? 0);

    return {
      success: true,
      data: items.map((comment) => this.to_comment_item({
        ...comment,
        status: comment.status as CommentStatus,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /** Get a single comment by ID. */
  async get_by_id(id: string): Promise<ApiResponse<CommentListItem>> {
    const [comment] = await db
      .select({
        id: comments.id,
        content_id: comments.content_id,
        content_title: contents.title,
        user_id: comments.user_id,
        author_name: comments.author_name,
        author_email: comments.author_email,
        body: comments.body,
        status: comments.status,
        parent_id: comments.parent_id,
        created_at: comments.created_at,
        updated_at: comments.updated_at,
      })
      .from(comments)
      .innerJoin(contents, eq(comments.content_id, contents.id))
      .where(eq(comments.id, id))
      .limit(1);

    if (!comment) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Comment not found' } };
    }

    return {
      success: true,
      data: this.to_comment_item({ ...comment, status: comment.status as CommentStatus }),
    };
  }

  /** Create a comment. Guests must provide name and email; authenticated users may omit them. */
  async create(input: CreateCommentInput, actor: CreateCommentActor): Promise<ApiResponse<CommentListItem>> {
    const [content] = await db
      .select({ id: contents.id, title: contents.title })
      .from(contents)
      .where(eq(contents.id, input.content_id))
      .limit(1);
    if (!content) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } };
    }

    if (input.parent_id) {
      const [parent] = await db
        .select({ id: comments.id, content_id: comments.content_id })
        .from(comments)
        .where(eq(comments.id, input.parent_id))
        .limit(1);
      if (!parent) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Parent comment not found' } };
      }
      if (parent.content_id !== input.content_id) {
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Parent comment belongs to a different content item' },
        };
      }
    }

    let author_name = input.author_name?.trim() || null;
    let author_email = input.author_email?.trim().toLowerCase() || null;

    if (actor.user_id) {
      const [user] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, actor.user_id))
        .limit(1);
      if (user) {
        author_name = author_name || user.name || null;
        author_email = author_email || user.email;
      }
    }

    if (!actor.user_id && (!author_name || !author_email)) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Guest comments require author_name and author_email',
        },
      };
    }

    const [comment] = await db
      .insert(comments)
      .values({
        id: randomUUID(),
        content_id: input.content_id,
        user_id: actor.user_id ?? null,
        author_name,
        author_email,
        body: input.body.trim(),
        parent_id: input.parent_id ?? null,
        status: 'PENDING',
      })
      .returning();

    if (!comment) {
      return { success: false, error: { code: 'CREATE_FAILED', message: 'Failed to create comment' } };
    }

    return {
      success: true,
      data: this.to_comment_item({
        ...comment,
        content_title: content.title,
        status: comment.status as CommentStatus,
      }),
    };
  }

  /** Moderate a comment by updating its status. */
  async moderate(id: string, input: ModerateCommentInput): Promise<ApiResponse<CommentListItem>> {
    const [existing] = await db
      .select({ id: comments.id })
      .from(comments)
      .where(eq(comments.id, id))
      .limit(1);
    if (!existing) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Comment not found' } };
    }

    const [comment] = await db
      .update(comments)
      .set({ status: input.status })
      .where(eq(comments.id, id))
      .returning();
    if (!comment) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Comment not found' } };
    }

    // Fetch content title for the response shape.
    const [content] = await db
      .select({ title: contents.title })
      .from(contents)
      .where(eq(contents.id, comment.content_id))
      .limit(1);

    return {
      success: true,
      data: this.to_comment_item({
        ...comment,
        content_title: content?.title ?? null,
        status: comment.status as CommentStatus,
      }),
    };
  }

  /** Permanently delete a comment. */
  async delete(id: string): Promise<ApiResponse<{ id: string }>> {
    const [deleted] = await db
      .delete(comments)
      .where(eq(comments.id, id))
      .returning({ id: comments.id });
    if (!deleted) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Comment not found' } };
    }

    return { success: true, data: { id: deleted.id } };
  }
}

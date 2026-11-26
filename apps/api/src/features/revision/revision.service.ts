/**
 * Revision Service — creates, lists, and restores content revision snapshots.
 *
 * Revisions capture a content snapshot on every update. A cap prevents unbounded growth.
 * Restore snapshots current state first so restores are reversible.
 */
import { randomUUID } from 'node:crypto';

import { CapabilityChecker } from '@typepress/core';
import type { Capability } from '@typepress/shared-types';
import { contents, db, revisions, users } from '@typepress/db';
import type { ApiResponse } from '@typepress/shared-types';
import { asc, desc, eq, inArray, sql } from 'drizzle-orm';

export interface RevisionActor {
  user_id: string;
  capabilities: Capability[];
}

/** Fields captured in a revision snapshot. Kept explicit for restore/type safety. */
export interface RevisionSnapshot {
  title: string;
  slug: string;
  type: string;
  status: string;
  meta: unknown;
  published_at: Date | null;
  password: string | null;
  is_sticky: boolean;
  format: string;
}

/** Shape of a revision row returned with author include. */
interface RevisionWithAuthor {
  id: string;
  content_id: string;
  data: unknown;
  author_id: string;
  created_at: Date;
  author: { name: string | null; email: string };
}

/** Minimal content fields needed for snapshotting and restore checks. */
interface ContentSnapshotSource {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  meta: unknown;
  published_at: Date | null;
  password: string | null;
  is_sticky: boolean;
  format: string;
  author_id: string;
}

export class RevisionService {
  private static readonly MAX_REVISIONS = 50;

  async list_by_content(content_id: string): Promise<ApiResponse<RevisionWithAuthor[]>> {
    const rows = await db
      .select({
        id: revisions.id,
        content_id: revisions.content_id,
        data: revisions.data,
        author_id: revisions.author_id,
        created_at: revisions.created_at,
        author_name: users.name,
        author_email: users.email,
      })
      .from(revisions)
      .innerJoin(users, eq(revisions.author_id, users.id))
      .where(eq(revisions.content_id, content_id))
      .orderBy(desc(revisions.created_at))
      .limit(RevisionService.MAX_REVISIONS);

    const result: RevisionWithAuthor[] = rows.map((row) => ({
      id: row.id,
      content_id: row.content_id,
      data: row.data,
      author_id: row.author_id,
      created_at: row.created_at,
      author: {
        name: row.author_name,
        email: row.author_email,
      },
    }));

    return { success: true, data: result };
  }

  /**
   * Create a revision snapshot. Prefers an explicit snapshot (from pre-update state)
   * to avoid race conditions; falls back to reading current DB state.
   */
  async create(content_id: string, author_id: string, snapshot?: RevisionSnapshot): Promise<void> {
    const data = snapshot ?? (await this.snapshot_from_db(content_id));
    if (!data) return;

    await db.insert(revisions).values({
      id: randomUUID(),
      content_id,
      author_id,
      data: data as unknown as Record<string, unknown>,
    });

    await this.enforce_limit(content_id);
  }

  /** Restore a revision into content. Snapshots current state before overwriting. */
  async restore(revision_id: string, actor?: RevisionActor): Promise<ApiResponse<{ message: string }>> {
    const [revision] = await db
      .select()
      .from(revisions)
      .where(eq(revisions.id, revision_id))
      .limit(1);
    if (!revision) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Revision not found' } };
    }

    const [content] = await db
      .select()
      .from(contents)
      .where(eq(contents.id, revision.content_id))
      .limit(1);
    if (!content) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } };
    }

    const content_row = content as ContentSnapshotSource;

    if (actor) {
      const caps = new CapabilityChecker(actor.capabilities);
      const can_edit =
        caps.has('content:edit:any') ||
        (caps.has('content:edit:own') && actor.user_id === content_row.author_id);
      if (!can_edit) {
        return {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have permission to restore this revision' },
        };
      }
    }

    const data = revision.data as Partial<RevisionSnapshot>;
    const restore_data = this.build_restore_data(data);

    // Restoring to PUBLISHED requires publish capability, same as content update.
    if (
      actor &&
      restore_data.status === 'PUBLISHED' &&
      !new CapabilityChecker(actor.capabilities).has('content:publish')
    ) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Missing required capability: content:publish' },
      };
    }

    // Prevent restoring a slug that now belongs to another content item.
    if (typeof restore_data.slug === 'string' && restore_data.slug !== content_row.slug) {
      const [slug_taken] = await db
        .select({ id: contents.id })
        .from(contents)
        .where(eq(contents.slug, restore_data.slug))
        .limit(1);
      if (slug_taken && slug_taken.id !== content_row.id) {
        return {
          success: false,
          error: { code: 'CONFLICT', message: 'Cannot restore revision: slug is already in use' },
        };
      }
    }

    // Snapshot current state before restore so the restore is reversible.
    await this.create(revision.content_id, actor?.user_id ?? revision.author_id, this.snapshot_from_content(content_row));

    await db
      .update(contents)
      .set(restore_data as Partial<typeof contents.$inferInsert>)
      .where(eq(contents.id, revision.content_id));

    return { success: true, data: { message: 'Revision restored' } };
  }

  /** Build a content snapshot from a content record. */
  snapshot_from_content(content: {
    title: string;
    slug: string;
    type: string;
    status: string;
    meta: unknown;
    published_at: Date | null;
    password: string | null;
    is_sticky: boolean;
    format: string;
  }): RevisionSnapshot {
    return {
      title: content.title,
      slug: content.slug,
      type: content.type,
      status: content.status,
      meta: content.meta,
      published_at: content.published_at,
      password: content.password,
      is_sticky: content.is_sticky,
      format: content.format,
    };
  }

  private async snapshot_from_db(content_id: string): Promise<RevisionSnapshot | null> {
    const [content] = await db.select().from(contents).where(eq(contents.id, content_id)).limit(1);
    if (!content) return null;
    return this.snapshot_from_content(content as ContentSnapshotSource);
  }

  /** Only restore known snapshot fields; ignore unknown keys for forward compatibility. */
  private build_restore_data(data: Partial<RevisionSnapshot>): Record<string, unknown> {
    const restore_data: Record<string, unknown> = {};
    if (typeof data.title === 'string') restore_data.title = data.title;
    if (typeof data.slug === 'string') restore_data.slug = data.slug;
    if (typeof data.type === 'string') restore_data.type = data.type;
    if (typeof data.status === 'string') restore_data.status = data.status;
    if (data.meta !== undefined) restore_data.meta = data.meta;
    if (data.published_at !== undefined) restore_data.published_at = data.published_at;
    if (data.password !== undefined) restore_data.password = data.password;
    if (typeof data.is_sticky === 'boolean') restore_data.is_sticky = data.is_sticky;
    if (typeof data.format === 'string') restore_data.format = data.format;
    return restore_data;
  }

  private async enforce_limit(content_id: string): Promise<void> {
    const count_rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(revisions)
      .where(eq(revisions.content_id, content_id));
    const count = count_rows[0]?.count ?? 0;
    if (count <= RevisionService.MAX_REVISIONS) return;

    // Delete oldest revisions beyond the cap. Loop handles edge cases; usually 1.
    const overflow = count - RevisionService.MAX_REVISIONS;
    const oldest = await db
      .select({ id: revisions.id })
      .from(revisions)
      .where(eq(revisions.content_id, content_id))
      .orderBy(asc(revisions.created_at))
      .limit(overflow);

    if (oldest.length > 0) {
      await db.delete(revisions).where(inArray(revisions.id, oldest.map((r) => r.id)));
    }
  }
}

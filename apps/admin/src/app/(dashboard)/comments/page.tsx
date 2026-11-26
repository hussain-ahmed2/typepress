/**
 * Comments Moderation Page — Admin view for reviewing and moderating comments.
 *
 * Uses shadcn primitives and semantic theme tokens for consistent theming.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, MessageSquare, RefreshCw, ShieldAlert, Trash2, XCircle } from 'lucide-react';
import { api } from '@/lib/api_client';
import { EmptyState, ErrorAlert, Loading } from '@/components/feedback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type CommentStatus = 'PENDING' | 'APPROVED' | 'SPAM' | 'TRASH';

interface CommentItem {
  id: string;
  content_id: string;
  content_title: string | null;
  user_id: string | null;
  author_name: string | null;
  author_email: string | null;
  body: string;
  status: CommentStatus;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_FILTERS: Array<{ label: string; value: 'ALL' | CommentStatus }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Spam', value: 'SPAM' },
  { label: 'Trash', value: 'TRASH' },
];

/** Status badge styling; status colors are intentional semantic exceptions for quick scanning. */
const status_badge_classes: Record<CommentStatus, string> = {
  PENDING: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  APPROVED: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  SPAM: 'border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-400',
  TRASH: 'border-destructive/20 bg-destructive/10 text-destructive',
};

export default function CommentsPage() {
  const [comments, set_comments] = useState<CommentItem[]>([]);
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState<string | null>(null);
  const [status_filter, set_status_filter] = useState<'ALL' | CommentStatus>('PENDING');
  const [busy_id, set_busy_id] = useState<string | null>(null);

  const fetch_comments = useCallback(async () => {
    set_loading(true);
    set_error(null);

    const query = status_filter === 'ALL' ? '' : `?status=${status_filter}`;
    const result = await api.get<CommentItem[] | { data?: CommentItem[] }>(`/api/comments${query}`);

    if (result.success && result.data) {
      const payload = result.data;
      if (Array.isArray(payload)) {
        set_comments(payload);
      } else {
        set_comments(payload.data ?? []);
      }
    } else {
      set_error(result.error?.message ?? 'Failed to load comments');
      set_comments([]);
    }

    set_loading(false);
  }, [status_filter]);

  useEffect(() => {
    void fetch_comments();
  }, [fetch_comments]);

  async function moderate_comment(id: string, status: CommentStatus): Promise<void> {
    set_busy_id(id);
    set_error(null);

    const result = await api.patch<CommentItem>(`/api/comments/${id}/moderate`, { status });
    if (!result.success) {
      set_error(result.error?.message ?? 'Failed to moderate comment');
      set_busy_id(null);
      return;
    }

    await fetch_comments();
    set_busy_id(null);
  }

  async function delete_comment(id: string): Promise<void> {
    set_busy_id(id);
    set_error(null);

    const result = await api.delete<{ id: string }>(`/api/comments/${id}`);
    if (!result.success) {
      set_error(result.error?.message ?? 'Failed to delete comment');
      set_busy_id(null);
      return;
    }

    await fetch_comments();
    set_busy_id(null);
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review, approve, spam, or remove comments.</p>
        </div>
        <Button
          type="button"
          onClick={() => {
            void fetch_comments();
          }}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Comment status filters">
        {STATUS_FILTERS.map((filter) => {
          const active = status_filter === filter.value;
          return (
            <Button
              key={filter.value}
              type="button"
              variant={active ? 'default' : 'outline'}
              size="sm"
              onClick={() => set_status_filter(filter.value)}
              aria-pressed={active}
            >
              {filter.label}
            </Button>
          );
        })}
      </div>

      {error ? <div className="mb-4"><ErrorAlert message={error} /></div> : null}

      {loading ? (
        <Loading />
      ) : comments.length === 0 ? (
        <Card className="drop-shadow">
          <EmptyState
            icon={<MessageSquare size={40} aria-hidden="true" />}
            title="No comments found"
            description="Comments matching this filter will appear here."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const busy = busy_id === comment.id;
            return (
              <Card key={comment.id} className="drop-shadow">
                <CardContent className="space-y-4 pt-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={status_badge_classes[comment.status]}
                        >
                          {comment.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {comment.author_name || 'Anonymous'}
                        {comment.author_email ? (
                          <span className="font-normal text-muted-foreground"> &lt;{comment.author_email}&gt;</span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        On: {comment.content_title || comment.content_id}
                      </p>
                    </div>
                  </div>

                  <p className="whitespace-pre-wrap break-words text-sm text-foreground">{comment.body}</p>

                  <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy || comment.status === 'APPROVED'}
                      onClick={() => {
                        void moderate_comment(comment.id, 'APPROVED');
                      }}
                      className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                    >
                      <Check size={14} aria-hidden="true" /> Approve
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy || comment.status === 'SPAM'}
                      onClick={() => {
                        void moderate_comment(comment.id, 'SPAM');
                      }}
                      className="border-orange-500/20 bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 dark:text-orange-400"
                    >
                      <ShieldAlert size={14} aria-hidden="true" /> Spam
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy || comment.status === 'TRASH'}
                      onClick={() => {
                        void moderate_comment(comment.id, 'TRASH');
                      }}
                      className="border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20"
                    >
                      <XCircle size={14} aria-hidden="true" /> Trash
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        void delete_comment(comment.id);
                      }}
                    >
                      <Trash2 size={14} aria-hidden="true" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

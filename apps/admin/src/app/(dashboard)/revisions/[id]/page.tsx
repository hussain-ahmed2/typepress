/**
 * Revisions Page — View and restore content revisions.
 *
 * Displays revision history for a content item and allows restoring a previous version.
 */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Clock, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api_client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

/** Revision snapshot returned by the revisions API. */
interface Revision {
  id: string;
  data: { title: string; slug: string; status: string; meta: Record<string, unknown> };
  author: { name: string; email: string };
  created_at: string;
}

/** API envelope for revision list responses. */
interface RevisionsResponse {
  data: Revision[];
}

/** Content revisions page. */
export default function RevisionsPage() {
  const params = useParams();
  const router = useRouter();
  const content_id = typeof params?.id === 'string' ? params.id : '';
  const [revisions, set_revisions] = useState<Revision[]>([]);
  const [loading, set_loading] = useState(true);
  const [load_error, set_load_error] = useState<string | null>(null);
  const [restoring_id, set_restoring_id] = useState<string | null>(null);
  const [restore_error, set_restore_error] = useState<string | null>(null);

  useEffect(() => {
    if (!content_id) {
      set_loading(false);
      set_load_error('Missing content ID.');
      return;
    }

    let cancelled = false;

    async function fetch_revisions(): Promise<void> {
      set_loading(true);
      set_load_error(null);

      try {
        const result = await api.get<RevisionsResponse>(`/api/content/${content_id}/revisions`);
        if (cancelled) return;

        if (result.success && result.data) {
          // API client may return the envelope as data; preserve existing shape.
          set_revisions(Array.isArray(result.data.data) ? result.data.data : []);
        } else {
          set_load_error(result.error?.message ?? 'Failed to load revisions.');
        }
      } catch {
        if (!cancelled) set_load_error('Failed to load revisions.');
      } finally {
        if (!cancelled) set_loading(false);
      }
    }

    void fetch_revisions();

    return () => {
      cancelled = true;
    };
  }, [content_id]);

  /** Restores a revision after explicit confirmation. */
  async function handle_restore(revision_id: string): Promise<void> {
    if (!content_id) return;
    const confirmed = window.confirm(
      'Restore this revision? Current changes will be overwritten.',
    );
    if (!confirmed) return;

    set_restoring_id(revision_id);
    set_restore_error(null);

    try {
      const result = await api.post(`/api/content/${content_id}/revisions/${revision_id}/restore`, {});
      if (result.success) {
        router.push(`/content/${content_id}`);
        return;
      }
      set_restore_error(result.error?.message ?? 'Failed to restore revision.');
    } catch {
      set_restore_error('Failed to restore revision.');
    } finally {
      set_restoring_id(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label="Go back"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Revisions</h1>
          <p className="text-sm text-muted-foreground">Review and restore previous content versions.</p>
        </div>
      </div>

      {restore_error ? (
        <Alert variant="destructive" className="mb-4 rounded-md">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Restore failed</AlertTitle>
          <AlertDescription>{restore_error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="space-y-4" aria-label="Loading revisions">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="rounded-md drop-shadow">
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : load_error ? (
        <Alert variant="destructive" className="rounded-md">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Unable to load revisions</AlertTitle>
          <AlertDescription>{load_error}</AlertDescription>
        </Alert>
      ) : revisions.length === 0 ? (
        <Card className="rounded-md drop-shadow">
          <CardContent className="p-0">
            <Empty className="border-0 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Clock aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No revisions yet</EmptyTitle>
                <EmptyDescription>
                  Revisions are created when you save content.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {revisions.map((revision) => {
            const is_restoring = restoring_id === revision.id;
            return (
              <Card key={revision.id} className="rounded-md drop-shadow">
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="text-base">{revision.data.title}</CardTitle>
                    <CardDescription>
                      {revision.author.name} · {new Date(revision.created_at).toLocaleString()}
                    </CardDescription>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <Badge variant="secondary">{revision.data.status}</Badge>
                      <span className="text-xs text-muted-foreground">Slug: {revision.data.slug}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handle_restore(revision.id)}
                    disabled={is_restoring}
                    aria-label={`Restore revision from ${new Date(revision.created_at).toLocaleString()}`}
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                    {is_restoring ? 'Restoring...' : 'Restore'}
                  </Button>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

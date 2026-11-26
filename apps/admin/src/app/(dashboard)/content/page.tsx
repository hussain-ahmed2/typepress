/**
 * Content List Page — Responsive content management.
 *
 * Uses shadcn Table/Card/Badge primitives and semantic theme tokens.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { api } from '@/lib/api_client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/** Content item shape returned by the content list endpoint. */
interface ContentItem {
  id: string;
  type: string;
  slug: string;
  title: string;
  status: string;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

/** Paginated list response shape returned by content API. */
interface PaginatedContentResponse {
  success: boolean;
  data?: ContentItem[];
  pagination?: {
    total: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

/** Status badge styling; status colors are intentional semantic exceptions for quick scanning. */
const status_badge_classes: Record<string, string> = {
  DRAFT: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  PUBLISHED: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  ARCHIVED: 'border-border bg-muted text-muted-foreground',
  TRASH: 'border-destructive/20 bg-destructive/10 text-destructive',
};

export default function ContentListPage() {
  const [contents, set_contents] = useState<ContentItem[]>([]);
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch_content(): Promise<void> {
      set_loading(true);
      set_error(null);
      const result = (await api.get('/api/content')) as PaginatedContentResponse;
      if (cancelled) return;

      if (result.success && Array.isArray(result.data)) {
        set_contents(result.data);
      } else {
        set_error(result.error?.message ?? 'Failed to load content');
      }

      set_loading(false);
    }

    void fetch_content();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Content</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage posts, pages, and drafts.</p>
        </div>
        <Button render={<Link href="/content/new" />} nativeButton={false}>
          <Plus size={16} aria-hidden="true" />
          New Content
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-4 border-destructive/20 bg-destructive/10">
          <AlertTitle>Failed to load content</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Card className="p-4">
          <div className="space-y-3" role="status" aria-live="polite" aria-label="Loading content">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      ) : contents.length === 0 ? (
        <Card className="drop-shadow">
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia className="text-muted-foreground [&_svg]:size-10">
                <FileText aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle className="text-lg font-medium text-foreground">No content yet</EmptyTitle>
              <EmptyDescription>Create your first post or page to get started.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden drop-shadow md:block">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-6">Title</TableHead>
                  <TableHead className="px-6">Type</TableHead>
                  <TableHead className="px-6">Status</TableHead>
                  <TableHead className="px-6">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contents.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="px-6 py-4">
                      <Link
                        href={`/content/${item.id}`}
                        className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm"
                      >
                        {item.title}
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-muted-foreground capitalize">{item.type}</TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={status_badge_classes[item.status] ?? 'border-border bg-muted text-muted-foreground'}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {contents.map((item) => (
              <Link
                key={item.id}
                href={`/content/${item.id}`}
                className="block rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <Card className="p-4 drop-shadow transition-[filter] hover:drop-shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium text-foreground">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground capitalize">
                        {item.type} · {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={status_badge_classes[item.status] ?? 'border-border bg-muted text-muted-foreground'}
                    >
                      {item.status}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

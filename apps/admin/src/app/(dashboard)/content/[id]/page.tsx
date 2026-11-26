/**
 * Content Editor Page — Create or edit content with block builder integration.
 *
 * Uses shadcn form primitives and semantic theme tokens.
 * Builder data is persisted in content meta.builder_data and validated by the API.
 */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import type { BuilderBlock, BuilderBlockType } from '@typepress/shared-types';
import { api } from '@/lib/api_client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BlockEditor } from '@/components/builder/block_editor';

/** Minimal content shape needed by the editor form. */
interface ContentEditorData {
  title: string;
  slug: string;
  type: string;
  status: string;
  meta?: {
    excerpt?: string;
    builder_data?: unknown;
    [key: string]: unknown;
  };
}

/** Content type options supported by the editor. */
const CONTENT_TYPES = ['post', 'page'] as const;
/** Publication status options supported by the editor. */
const CONTENT_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
/** Allowed builder block types for client-side sanitization before editor load. */
const BUILDER_BLOCK_TYPES: readonly BuilderBlockType[] = ['heading', 'text', 'image', 'button', 'divider', 'container'];

type ContentType = (typeof CONTENT_TYPES)[number];
type ContentStatus = (typeof CONTENT_STATUSES)[number];

function is_content_type(value: string): value is ContentType {
  return CONTENT_TYPES.includes(value as ContentType);
}

function is_content_status(value: string): value is ContentStatus {
  return CONTENT_STATUSES.includes(value as ContentStatus);
}

function is_builder_block_type(value: unknown): value is BuilderBlockType {
  return typeof value === 'string' && (BUILDER_BLOCK_TYPES as readonly string[]).includes(value);
}

function is_builder_prop_value(value: unknown): value is string | number | boolean | null {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

/** Sanitizes unknown meta.builder_data into typed builder blocks for the editor. */
function sanitize_builder_data(value: unknown): BuilderBlock[] {
  if (!Array.isArray(value)) return [];

  const blocks: BuilderBlock[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== 'string' || !is_builder_block_type(record.type)) continue;

    const props_record = record.props && typeof record.props === 'object' && !Array.isArray(record.props)
      ? (record.props as Record<string, unknown>)
      : {};
    const props: Record<string, string | number | boolean | null> = {};
    for (const [key, prop_value] of Object.entries(props_record)) {
      if (is_builder_prop_value(prop_value)) {
        props[key] = prop_value;
      }
    }

    blocks.push({ id: record.id, type: record.type, props });
    if (blocks.length >= 200) break; // Keep client state bounded; API enforces same limit.
  }

  return blocks;
}

export default function ContentEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const is_editing = id !== undefined && id !== 'new';

  const [title, set_title] = useState('');
  const [slug, set_slug] = useState('');
  const [type, set_type] = useState<ContentType>('post');
  const [status, set_status] = useState<ContentStatus>('DRAFT');
  const [meta_excerpt, set_meta_excerpt] = useState('');
  const [builder_blocks, set_builder_blocks] = useState<BuilderBlock[]>([]);
  const [other_meta, set_other_meta] = useState<Record<string, unknown>>({});
  const [saving, set_saving] = useState(false);
  const [loading, set_loading] = useState(false);
  const [load_error, set_load_error] = useState<string | null>(null);

  useEffect(() => {
    if (!is_editing || !id) {
      // Reset form when navigating to "new" so stale edit state does not leak.
      set_title('');
      set_slug('');
      set_type('post');
      set_status('DRAFT');
      set_meta_excerpt('');
      set_builder_blocks([]);
      set_other_meta({});
      set_load_error(null);
      set_loading(false);
      return;
    }

    let cancelled = false;
    set_loading(true);
    set_load_error(null);
    set_builder_blocks([]); // Prevent stale blocks flashing while loading new content.

    async function fetch_content(content_id: string): Promise<void> {
      const result = await api.get<ContentEditorData>(`/api/content/${content_id}`);
      if (cancelled) return;

      if (result.success && result.data) {
        const content = result.data;
        set_title(content.title);
        set_slug(content.slug);
        if (is_content_type(content.type)) set_type(content.type);
        if (is_content_status(content.status)) set_status(content.status);
        set_meta_excerpt(typeof content.meta?.excerpt === 'string' ? content.meta.excerpt : '');
        set_builder_blocks(sanitize_builder_data(content.meta?.builder_data));
        // Preserve unknown meta keys so saving builder data does not drop them.
        const meta_record: Record<string, unknown> =
          content.meta && typeof content.meta === 'object' ? { ...content.meta } : {};
        delete meta_record.excerpt;
        delete meta_record.builder_data;
        set_other_meta(meta_record);
      } else {
        set_load_error(result.error?.message ?? 'Failed to load content');
      }

      set_loading(false);
    }

    void fetch_content(id);

    return () => {
      cancelled = true;
    };
  }, [id, is_editing]);

  function generate_slug(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  async function handle_submit(): Promise<void> {
    set_saving(true);
    set_load_error(null);
    const body = {
      title,
      slug: slug || generate_slug(title),
      type,
      status,
      meta: {
        ...other_meta,
        excerpt: meta_excerpt,
        builder_data: builder_blocks,
      },
    };
    const result = is_editing
      ? await api.put(`/api/content/${id}`, body)
      : await api.post('/api/content', body);
    set_saving(false);

    if (result.success) {
      router.push('/content');
    } else {
      set_load_error(result.error?.message ?? 'Failed to save content');
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-foreground">
          {is_editing ? 'Edit Content' : 'New Content'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {is_editing ? 'Update content details, builder blocks, and publishing status.' : 'Create a new post or page.'}
        </p>
      </div>

      {load_error ? (
        <Alert variant="destructive" className="mb-4 max-w-3xl border-destructive/20 bg-destructive/10" role="alert">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertTitle>Unable to save or load content</AlertTitle>
          <AlertDescription>{load_error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-6">
        <Card className="max-w-3xl drop-shadow">
          <CardContent className="space-y-6 pt-0">
            {loading ? (
              <div className="space-y-4" role="status" aria-live="polite" aria-label="Loading content">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="content-title">Title</Label>
                  <Input
                    id="content-title"
                    type="text"
                    value={title}
                    onChange={(e) => set_title(e.target.value)}
                    placeholder="Enter title..."
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content-slug">Slug</Label>
                  <Input
                    id="content-slug"
                    type="text"
                    value={slug}
                    onChange={(e) => set_slug(e.target.value)}
                    placeholder="auto-generated-from-title"
                    autoComplete="off"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label id="content-type-label">Type</Label>
                    <Select
                      value={type}
                      onValueChange={(value) => {
                        if (typeof value === 'string' && is_content_type(value)) set_type(value);
                      }}
                    >
                      <SelectTrigger className="w-full" aria-labelledby="content-type-label">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="post">Post</SelectItem>
                        <SelectItem value="page">Page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label id="content-status-label">Status</Label>
                    <Select
                      value={status}
                      onValueChange={(value) => {
                        if (typeof value === 'string' && is_content_status(value)) set_status(value);
                      }}
                    >
                      <SelectTrigger className="w-full" aria-labelledby="content-status-label">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="PUBLISHED">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content-excerpt">Excerpt</Label>
                  <Textarea
                    id="content-excerpt"
                    value={meta_excerpt}
                    onChange={(e) => set_meta_excerpt(e.target.value)}
                    rows={3}
                    placeholder="Optional summary..."
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() => {
                      void handle_submit();
                    }}
                    disabled={saving || !title.trim()}
                  >
                    {saving ? 'Saving...' : is_editing ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.push('/content')}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {!loading ? (
          <section aria-labelledby="builder-section-title" className="space-y-3">
            <div className="max-w-3xl">
              <h2 id="builder-section-title" className="text-lg font-semibold text-foreground">Page Builder</h2>
              <p className="text-sm text-muted-foreground">
                Build content with blocks. Saved blocks are stored in <code>meta.builder_data</code>.
              </p>
            </div>
            <div className="overflow-hidden rounded-md border border-border bg-card drop-shadow">
              <BlockEditor initial_blocks={builder_blocks} onChange={set_builder_blocks} />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
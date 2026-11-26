/**
 * Builder Content — Page builder workspace with save controls.
 *
 * Owns builder block state and persists it to the content API.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Save } from 'lucide-react';
import { api } from '@/lib/api_client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BlockEditor, type Block } from './block_editor';

/** Builder workspace with save action. */
export default function BuilderContent() {
  const router = useRouter();
  const [blocks, set_blocks] = useState<Block[]>([]);
  const [title, set_title] = useState('Builder Page');
  const [saving, set_saving] = useState(false);
  const [save_error, set_save_error] = useState<string | null>(null);

  /** Persists current builder state as a draft page. */
  async function handle_save(): Promise<void> {
    set_saving(true);
    set_save_error(null);

    try {
      const result = await api.post('/api/content', {
        type: 'page',
        slug: `page-${Date.now()}`,
        title: title.trim() || 'Builder Page',
        status: 'DRAFT',
        meta: { builder_data: blocks },
      });

      if (result.success) {
        router.push('/content');
        return;
      }

      set_save_error(result.error?.message || 'Failed to save page.');
    } catch {
      set_save_error('Failed to save page.');
    } finally {
      set_saving(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-4 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Page Builder</h1>
          <div className="max-w-sm space-y-1">
            <Label htmlFor="builder-page-title">Page title</Label>
            <Input
              id="builder-page-title"
              value={title}
              onChange={(event) => set_title(event.target.value)}
              placeholder="Builder Page"
            />
          </div>
        </div>
        <Button type="button" onClick={() => void handle_save()} disabled={saving}>
          <Save size={16} aria-hidden="true" />
          {saving ? 'Saving...' : 'Save Draft'}
        </Button>
      </div>

      {save_error ? (
        <Alert variant="destructive" className="rounded-md">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Save failed</AlertTitle>
          <AlertDescription>{save_error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-card drop-shadow">
        <BlockEditor initial_blocks={blocks} onChange={set_blocks} />
      </div>
    </div>
  );
}

/**
 * Media Library Page — Browse and upload media files.
 *
 * Uses the media API for listing and multipart uploads. Uploads include CSRF
 * token handling to match the admin API client's security behavior.
 */
'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AlertCircle, File, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { MediaItem } from '@typepress/shared-types';
import { api } from '@/lib/api_client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

/** Pagination metadata returned by list endpoints. */
interface PaginationMeta {
  page?: number;
  limit?: number;
  total: number;
  total_pages?: number;
}

/** Paginated response shape for media list endpoint. */
interface PaginatedMediaResponse {
  success: boolean;
  data?: MediaItem[];
  pagination?: PaginationMeta;
  error?: {
    code: string;
    message: string;
  };
}

/** CSRF endpoint response payload. */
interface CsrfTokenData {
  csrf_token: string;
}

/** API base URL mirrored from the admin API client for direct upload requests. */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** Formats byte sizes for compact display in the media grid. */
function format_size(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Resolve a media URL to an absolute URL for the admin app. */
function resolve_media_url(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const normalized_path = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE}${normalized_path}`;
}

/** Pick the best preview URL for an image media item (thumbnail variant preferred). */
function get_media_preview_url(item: MediaItem): string | null {
  if (!item.mimetype.startsWith('image/')) return null;

  const variants = Array.isArray(item.variants) ? item.variants : [];
  const preferred_variant_names = ['thumbnail', 'small', 'medium', 'large'];
  for (const name of preferred_variant_names) {
    const variant = variants.find((entry) => entry.name === name);
    if (variant) return resolve_media_url(variant.url);
  }

  return resolve_media_url(item.url);
}

/** Renders an icon representing the media MIME type. */
function MediaTypeIcon({ mimetype }: { mimetype: string }) {
  if (mimetype.startsWith('image/')) {
    return <ImageIcon className="size-8 text-primary" aria-hidden="true" />;
  }
  return <File className="size-8 text-muted-foreground" aria-hidden="true" />;
}

/** Uploads a file using multipart/form-data with CSRF protection. */
async function upload_media_file(file: File): Promise<{ success: boolean; message?: string }> {
  const csrf_result = await api.get<CsrfTokenData>('/api/auth/csrf');
  const csrf_token = csrf_result.success ? csrf_result.data?.csrf_token : undefined;

  const form_data = new FormData();
  form_data.append('file', file);

  const headers: Record<string, string> = {};
  if (csrf_token) {
    headers['x-csrf-token'] = csrf_token;
  }

  try {
    const response = await fetch(`${API_BASE}/api/media/upload`, {
      method: 'POST',
      body: form_data,
      credentials: 'include',
      headers,
    });

    const payload = (await response.json()) as { success?: boolean; error?: { message?: string } };
    if (response.ok && payload.success) {
      return { success: true };
    }

    return {
      success: false,
      message: payload.error?.message ?? `Upload failed (${response.status})`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return { success: false, message };
  }
}

/** Renders the media library with upload, list, and delete capabilities. */
export default function MediaPage() {
  const [media, set_media] = useState<MediaItem[]>([]);
  const [loading, set_loading] = useState<boolean>(true);
  const [error, set_error] = useState<string | null>(null);
  const [uploading, set_uploading] = useState<boolean>(false);
  const [delete_target, set_delete_target] = useState<MediaItem | null>(null);
  const [deleting_id, set_deleting_id] = useState<string | null>(null);
  const file_input_ref = useRef<HTMLInputElement | null>(null);

  /** Fetches media items from the API. */
  const fetch_media = useCallback(async (): Promise<void> => {
    set_loading(true);
    set_error(null);

    const result = (await api.get('/api/media')) as PaginatedMediaResponse;

    if (result.success && Array.isArray(result.data)) {
      set_media(result.data);
    } else {
      set_error(result.error?.message ?? 'Failed to load media');
    }

    set_loading(false);
  }, []);

  useEffect(() => {
    void fetch_media();
  }, [fetch_media]);

  /** Opens the hidden file picker for uploads. */
  function handle_upload_click(): void {
    file_input_ref.current?.click();
  }

  /** Handles file selection and uploads the chosen file to the media API. */
  async function handle_file_change(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = ''; // Allow re-selecting the same file.
    if (!file) return;

    set_uploading(true);
    const result = await upload_media_file(file);
    set_uploading(false);

    if (result.success) {
      toast.success(`Uploaded "${file.name}"`);
      await fetch_media();
    } else {
      toast.error(result.message ?? 'Failed to upload file');
    }
  }

  /** Deletes the selected media item after confirmation. */
  async function handle_delete_confirmed(): Promise<void> {
    if (!delete_target) return;

    const target = delete_target;
    set_deleting_id(target.id);

    const result = await api.delete(`/api/media/${target.id}`);
    set_deleting_id(null);
    set_delete_target(null);

    if (result.success) {
      toast.success(`Deleted "${target.filename}"`);
      await fetch_media();
    } else {
      toast.error(result.error?.message ?? 'Failed to delete media');
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Media Library</h1>
          <p className="text-sm text-muted-foreground">Upload and manage images and files used across the site.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={file_input_ref}
            type="file"
            className="hidden"
            onChange={(event) => { void handle_file_change(event); }}
            aria-label="Upload media file"
          />
          <Button type="button" onClick={handle_upload_click} disabled={uploading} className="rounded-md drop-shadow-sm">
            {uploading ? <Spinner className="size-4" /> : <Upload className="size-4" aria-hidden="true" />}
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-6 border-destructive/20 bg-destructive/10">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4" aria-label="Loading media" role="status">
          {Array.from({ length: 8 }, (_, index) => (
            <Card key={index} className="overflow-hidden rounded-md drop-shadow">
              <Skeleton className="aspect-square w-full rounded-none" />
              <CardContent className="space-y-2 p-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : media.length === 0 && !error ? (
        <Card className="rounded-md drop-shadow">
          <CardContent className="p-0">
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia className="text-muted-foreground [&_svg]:size-10">
                  <ImageIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle className="text-foreground">No media uploaded yet</EmptyTitle>
                <EmptyDescription>Upload an image or file to start building your media library.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {media.map((item) => {
            const is_deleting = deleting_id === item.id;
            return (
              <Card key={item.id} className="group overflow-hidden rounded-md drop-shadow">
                <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-muted">
                  {get_media_preview_url(item) ? (
                    <>
                      {/* Native img is intentional: media URLs may be local or S3-compatible at runtime. */}
                      <img
                        src={get_media_preview_url(item) ?? ''}
                        alt={item.filename}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </>
                  ) : (
                    <MediaTypeIcon mimetype={item.mimetype} />
                  )}
                  <div className="absolute right-2 top-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      className="rounded-md drop-shadow-sm"
                      onClick={() => set_delete_target(item)}
                      disabled={is_deleting}
                      aria-label={`Delete ${item.filename}`}
                    >
                      {is_deleting ? <Spinner className="size-4" /> : <Trash2 className="size-4" aria-hidden="true" />}
                    </Button>
                  </div>
                </div>
                <CardContent className="space-y-2 p-3">
                  <p className="truncate text-sm font-medium text-foreground" title={item.filename}>
                    {item.filename}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{format_size(item.size)}</p>
                    <Badge variant="secondary" className="rounded-md px-1.5 py-0 text-[10px] uppercase">
                      {item.mimetype.split('/')[1]?.slice(0, 8) || 'file'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={delete_target !== null} onOpenChange={(open) => { if (!open && !deleting_id) set_delete_target(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete media?</AlertDialogTitle>
            <AlertDialogDescription>
              {delete_target ? `This will permanently delete "${delete_target.filename}". This action cannot be undone.` : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting_id !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handle_delete_confirmed();
              }}
              disabled={deleting_id !== null}
            >
              {deleting_id ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

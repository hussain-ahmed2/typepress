/**
 * Taxonomy Page — Manage categories and tags with create/delete workflows.
 *
 * Uses shadcn primitives and semantic tokens for consistent admin styling.
 * Preserves existing taxonomy API flows while improving feedback states.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Plus, Tags, Trash2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/** Taxonomy record returned by the API. */
interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
  type: string;
}

/** Paginated/list envelope used by the taxonomy list endpoint. */
interface TaxonomyListData {
  data: TaxonomyItem[];
}

/** Supported taxonomy types for creation. */
type TaxonomyType = 'category' | 'tag';

/** Narrows a string to supported taxonomy type values. */
function to_taxonomy_type(value: string): TaxonomyType {
  return value === 'tag' ? 'tag' : 'category';
}

/** Validation schema for taxonomy creation. Slug is optional (auto-derived from name). */
const create_taxonomy_schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  slug: z.string().trim(),
  type: z.enum(['category', 'tag']),
});

type CreateTaxonomyFormValues = z.infer<typeof create_taxonomy_schema>;

/** Renders taxonomy management UI with create and delete actions. */
export default function TaxonomyPage() {
  const [taxonomies, set_taxonomies] = useState<TaxonomyItem[]>([]);
  const [loading, set_loading] = useState<boolean>(true);
  const [load_error, set_load_error] = useState<string | null>(null);
  const [delete_target, set_delete_target] = useState<TaxonomyItem | null>(null);
  const [deleting_id, set_deleting_id] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting: is_creating },
  } = useForm<CreateTaxonomyFormValues>({
    resolver: zodResolver(create_taxonomy_schema),
    defaultValues: { name: '', slug: '', type: 'category' },
    mode: 'onSubmit',
  });

  /** Loads taxonomies from the API and updates local list state. */
  const fetch_taxonomies = useCallback(async (): Promise<void> => {
    set_loading(true);
    set_load_error(null);

    const result = await api.get<TaxonomyListData>('/api/taxonomy');
    if (result.success && result.data) {
      set_taxonomies(result.data.data);
    } else {
      set_load_error(result.error?.message ?? 'Failed to load taxonomies');
    }

    set_loading(false);
  }, []);

  useEffect(() => {
    void fetch_taxonomies();
  }, [fetch_taxonomies]);

  /** Creates a taxonomy using validated form values. */
  async function on_submit_create(values: CreateTaxonomyFormValues): Promise<void> {
    const trimmed_name = values.name.trim();
    const slug_source = values.slug.trim() || trimmed_name;
    const slug = slug_source.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const result = await api.post('/api/taxonomy', {
      name: trimmed_name,
      slug,
      type: values.type,
    });

    if (result.success) {
      reset({ name: '', slug: '', type: values.type });
      toast.success('Taxonomy created');
      await fetch_taxonomies();
    } else {
      toast.error(result.error?.message ?? 'Failed to create taxonomy');
    }
  }

  /** Deletes the currently selected taxonomy after confirmation. */
  async function handle_delete_confirmed(): Promise<void> {
    if (!delete_target) return;

    const target = delete_target;
    set_deleting_id(target.id);

    const result = await api.delete(`/api/taxonomy/${target.id}`);
    set_deleting_id(null);
    set_delete_target(null);

    if (result.success) {
      toast.success(`Deleted "${target.name}"`);
      await fetch_taxonomies();
    } else {
      toast.error(result.error?.message ?? 'Failed to delete taxonomy');
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Taxonomy</h1>
        <p className="text-sm text-muted-foreground">Organize content with categories and tags.</p>
      </div>

      <Card className="mb-6 rounded-md drop-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Add Taxonomy</CardTitle>
          <CardDescription>Create a category or tag for content organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(on_submit_create)} className="grid gap-4 md:grid-cols-[1fr_1fr_180px_auto] md:items-end" noValidate>
            <Field data-invalid={errors.name ? true : undefined}>
              <FieldLabel htmlFor="taxonomy-name">Name</FieldLabel>
              <Input
                id="taxonomy-name"
                type="text"
                placeholder="Category name"
                aria-invalid={errors.name ? true : undefined}
                {...register('name')}
              />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field data-invalid={errors.slug ? true : undefined}>
              <FieldLabel htmlFor="taxonomy-slug">Slug</FieldLabel>
              <Input
                id="taxonomy-slug"
                type="text"
                placeholder="auto-generated"
                aria-invalid={errors.slug ? true : undefined}
                {...register('slug')}
              />
              <FieldError errors={[errors.slug]} />
            </Field>

            <Field data-invalid={errors.type ? true : undefined}>
              <FieldLabel htmlFor="taxonomy-type">Type</FieldLabel>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (typeof value === 'string') field.onChange(to_taxonomy_type(value));
                    }}
                  >
                    <SelectTrigger id="taxonomy-type" className="w-full" aria-invalid={errors.type ? true : undefined}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="tag">Tag</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.type]} />
            </Field>

            <Button type="submit" disabled={is_creating} className="rounded-md drop-shadow-sm">
              {is_creating ? <Spinner className="size-4" /> : <Plus className="size-4" aria-hidden="true" />}
              {is_creating ? 'Adding...' : 'Add'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {load_error ? (
        <Alert variant="destructive" className="mb-6 border-destructive/20 bg-destructive/10">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{load_error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Card className="rounded-md drop-shadow">
          <CardContent className="space-y-3 p-6" aria-label="Loading taxonomies" role="status">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : taxonomies.length === 0 && !load_error ? (
        <Card className="rounded-md drop-shadow">
          <CardContent className="p-0">
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia className="text-muted-foreground [&_svg]:size-10">
                  <Tags aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle className="text-foreground">No taxonomies yet</EmptyTitle>
                <EmptyDescription>Create your first category or tag to organize content.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-md drop-shadow">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-6 py-3 text-xs uppercase text-muted-foreground">Name</TableHead>
                <TableHead className="px-6 py-3 text-xs uppercase text-muted-foreground">Slug</TableHead>
                <TableHead className="px-6 py-3 text-xs uppercase text-muted-foreground">Type</TableHead>
                <TableHead className="px-6 py-3 text-right text-xs uppercase text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxonomies.map((item) => {
                const is_deleting = deleting_id === item.id;
                return (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell className="px-6 py-4 font-medium text-foreground">{item.name}</TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">{item.slug}</TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge variant="secondary" className="rounded-md capitalize">
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => set_delete_target(item)}
                        disabled={is_deleting}
                        aria-label={`Delete ${item.name}`}
                      >
                        {is_deleting ? <Spinner className="size-4" /> : <Trash2 className="size-4" aria-hidden="true" />}
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <AlertDialog open={delete_target !== null} onOpenChange={(open) => { if (!open && !deleting_id) set_delete_target(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete taxonomy?</AlertDialogTitle>
            <AlertDialogDescription>
              {delete_target ? `This will permanently delete "${delete_target.name}". This action cannot be undone.` : 'This action cannot be undone.'}
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

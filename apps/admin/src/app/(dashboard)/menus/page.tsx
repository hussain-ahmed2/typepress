/**
 * Menus Page — Manage navigation menus and their items.
 *
 * Preserves existing menu API flows while adding semantic styling,
 * loading/error/empty states, and confirmation for destructive actions.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, GripVertical, MenuSquare, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
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
import { Field, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

/** Menu item record returned by the API. */
interface MenuItem {
  id: string;
  label: string;
  url: string;
  target: string | null;
  parent_id: string | null;
  order: number;
  children: MenuItem[];
}

/** Menu record returned by the API. */
interface Menu {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  items: MenuItem[];
}

/** List envelope used by menus endpoint. */
interface MenuListData {
  data: Menu[];
}

/** Destructive action pending confirmation. */
type PendingDelete =
  | { kind: 'menu'; menu: Menu }
  | { kind: 'item'; item: MenuItem; menu_id: string };

/** Validation schema for creating a new menu. */
const create_menu_schema = z.object({
  name: z.string().trim().min(1, 'Menu name is required'),
});

type CreateMenuFormValues = z.infer<typeof create_menu_schema>;

/** Validation schema for adding a menu item. */
const add_menu_item_schema = z.object({
  label: z.string().trim().min(1, 'Label is required'),
  url: z.string().trim().min(1, 'URL is required'),
});

type AddMenuItemFormValues = z.infer<typeof add_menu_item_schema>;

/** Renders menu management with create/delete and item editing. */
export default function MenusPage() {
  const [menus, set_menus] = useState<Menu[]>([]);
  const [selected_menu_id, set_selected_menu_id] = useState<string | null>(null);
  const [loading, set_loading] = useState<boolean>(true);
  const [load_error, set_load_error] = useState<string | null>(null);
  const [pending_delete, set_pending_delete] = useState<PendingDelete | null>(null);
  const [deleting, set_deleting] = useState<boolean>(false);
  const selected_menu_id_ref = useRef<string | null>(null);

  const {
    register: register_create_menu,
    handleSubmit: handle_submit_create_menu,
    reset: reset_create_menu,
    formState: { errors: create_menu_errors, isSubmitting: is_creating_menu },
  } = useForm<CreateMenuFormValues>({
    resolver: zodResolver(create_menu_schema),
    defaultValues: { name: '' },
    mode: 'onSubmit',
  });

  const {
    register: register_add_item,
    handleSubmit: handle_submit_add_item,
    reset: reset_add_item,
    formState: { errors: add_item_errors, isSubmitting: is_adding_item },
  } = useForm<AddMenuItemFormValues>({
    resolver: zodResolver(add_menu_item_schema),
    defaultValues: { label: '', url: '' },
    mode: 'onSubmit',
  });

  /** Keeps the selected menu ref in sync for stable async callbacks. */
  function select_menu(menu_id: string | null): void {
    selected_menu_id_ref.current = menu_id;
    set_selected_menu_id(menu_id);
  }

  /** Loads menus and keeps the selected menu in sync with fresh data. */
  const fetch_menus = useCallback(async (preferred_menu_id?: string | null): Promise<void> => {
    set_loading(true);
    set_load_error(null);

    const result = await api.get<MenuListData>('/api/menus');
    if (result.success && result.data) {
      const next_menus = result.data.data;
      set_menus(next_menus);

      const target_id = preferred_menu_id !== undefined ? preferred_menu_id : selected_menu_id_ref.current;
      if (target_id) {
        const still_exists = next_menus.some((menu) => menu.id === target_id);
        select_menu(still_exists ? target_id : (next_menus[0]?.id ?? null));
      } else {
        select_menu(next_menus[0]?.id ?? null);
      }
    } else {
      set_load_error(result.error?.message ?? 'Failed to load menus');
    }

    set_loading(false);
  }, []);

  useEffect(() => {
    void fetch_menus(null);
  }, [fetch_menus]);

  const selected_menu = menus.find((menu) => menu.id === selected_menu_id) ?? null;

  /** Creates a new menu and refreshes the list. */
  async function on_submit_create_menu(values: CreateMenuFormValues): Promise<void> {
    const trimmed_name = values.name.trim();
    const slug = trimmed_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const result = await api.post<Menu>('/api/menus', { name: trimmed_name, slug });

    if (result.success) {
      reset_create_menu({ name: '' });
      toast.success('Menu created');
      const created_id = result.data?.id ?? null;
      await fetch_menus(created_id);
    } else {
      toast.error(result.error?.message ?? 'Failed to create menu');
    }
  }

  /** Adds an item to the currently selected menu. */
  async function on_submit_add_item(values: AddMenuItemFormValues): Promise<void> {
    if (!selected_menu) return;

    const result = await api.post(`/api/menus/${selected_menu.id}/items`, {
      label: values.label.trim(),
      url: values.url.trim(),
    });

    if (result.success) {
      reset_add_item({ label: '', url: '' });
      toast.success('Menu item added');
      await fetch_menus(selected_menu.id);
    } else {
      toast.error(result.error?.message ?? 'Failed to add menu item');
    }
  }

  /** Executes the pending destructive action after confirmation. */
  async function handle_delete_confirmed(): Promise<void> {
    if (!pending_delete) return;

    set_deleting(true);

    if (pending_delete.kind === 'menu') {
      const result = await api.delete(`/api/menus/${pending_delete.menu.id}`);
      set_deleting(false);
      set_pending_delete(null);

      if (result.success) {
        toast.success(`Deleted menu "${pending_delete.menu.name}"`);
        const next_selected = selected_menu_id === pending_delete.menu.id ? null : selected_menu_id;
        await fetch_menus(next_selected);
      } else {
        toast.error(result.error?.message ?? 'Failed to delete menu');
      }
      return;
    }

    const result = await api.delete(`/api/menus/items/${pending_delete.item.id}`);
    set_deleting(false);
    set_pending_delete(null);

    if (result.success) {
      toast.success('Menu item deleted');
      await fetch_menus(pending_delete.menu_id);
    } else {
      toast.error(result.error?.message ?? 'Failed to delete menu item');
    }
  }

  const delete_dialog_title = pending_delete?.kind === 'menu' ? 'Delete menu?' : 'Delete menu item?';
  const delete_dialog_description = pending_delete?.kind === 'menu'
    ? `This will permanently delete "${pending_delete.menu.name}" and its items.`
    : pending_delete?.kind === 'item'
      ? `This will permanently delete "${pending_delete.item.label}".`
      : 'This action cannot be undone.';

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Menus</h1>
        <p className="text-sm text-muted-foreground">Build and organize navigation menus for your site.</p>
      </div>

      {load_error ? (
        <Alert variant="destructive" className="mb-6 border-destructive/20 bg-destructive/10">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{load_error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="rounded-md drop-shadow">
          <CardHeader>
            <CardTitle className="text-lg">All Menus</CardTitle>
            <CardDescription>Select a menu to edit its items.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-2" aria-label="Loading menus" role="status">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : menus.length === 0 ? (
              <Empty className="border border-dashed border-border py-8">
                <EmptyHeader>
                  <EmptyMedia className="text-muted-foreground [&_svg]:size-8">
                    <MenuSquare aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle className="text-base text-foreground">No menus</EmptyTitle>
                  <EmptyDescription>Create a menu to get started.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="space-y-2" role="listbox" aria-label="Menus">
                {menus.map((menu) => {
                  const is_selected = selected_menu_id === menu.id;
                  return (
                    <button
                      key={menu.id}
                      type="button"
                      role="option"
                      aria-selected={is_selected}
                      onClick={() => select_menu(menu.id)}
                      className={`w-full rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        is_selected
                          ? 'border-primary/30 bg-primary/10'
                          : 'border-border bg-muted/30 hover:bg-muted/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-foreground">{menu.name}</p>
                        <Badge variant="secondary" className="rounded-md">
                          {menu.items?.length ?? 0}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{menu.slug}</p>
                    </button>
                  );
                })}
              </div>
            )}

            <form onSubmit={handle_submit_create_menu(on_submit_create_menu)} className="flex gap-2" noValidate>
              <Field data-invalid={create_menu_errors.name ? true : undefined} className="flex-1">
                <Input
                  type="text"
                  placeholder="New menu name"
                  aria-label="New menu name"
                  aria-invalid={create_menu_errors.name ? true : undefined}
                  {...register_create_menu('name')}
                />
                <FieldError errors={[create_menu_errors.name]} />
              </Field>
              <Button
                type="submit"
                disabled={is_creating_menu}
                className="rounded-md drop-shadow-sm"
                aria-label="Create menu"
              >
                {is_creating_menu ? <Spinner className="size-4" /> : <Plus className="size-4" aria-hidden="true" />}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-md drop-shadow lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">{selected_menu ? selected_menu.name : 'Menu Items'}</CardTitle>
                <CardDescription>
                  {selected_menu ? 'Add and manage links in this menu.' : 'Select a menu to edit its items.'}
                </CardDescription>
              </div>
              {selected_menu ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => set_pending_delete({ kind: 'menu', menu: selected_menu })}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete Menu
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {selected_menu ? (
              <div className="space-y-4">
                <form onSubmit={handle_submit_add_item(on_submit_add_item)} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" noValidate>
                  <Field data-invalid={add_item_errors.label ? true : undefined}>
                    <Input
                      type="text"
                      placeholder="Label"
                      aria-label="Menu item label"
                      aria-invalid={add_item_errors.label ? true : undefined}
                      {...register_add_item('label')}
                    />
                    <FieldError errors={[add_item_errors.label]} />
                  </Field>
                  <Field data-invalid={add_item_errors.url ? true : undefined}>
                    <Input
                      type="text"
                      placeholder="URL"
                      aria-label="Menu item URL"
                      aria-invalid={add_item_errors.url ? true : undefined}
                      {...register_add_item('url')}
                    />
                    <FieldError errors={[add_item_errors.url]} />
                  </Field>
                  <Button type="submit" disabled={is_adding_item} className="rounded-md drop-shadow-sm self-start">
                    {is_adding_item ? <Spinner className="size-4" /> : <Plus className="size-4" aria-hidden="true" />}
                    Add
                  </Button>
                </form>

                <div className="space-y-2">
                  {(selected_menu.items?.length ?? 0) === 0 ? (
                    <Empty className="border border-dashed border-border py-10">
                      <EmptyHeader>
                        <EmptyMedia className="text-muted-foreground [&_svg]:size-8">
                          <MenuSquare aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle className="text-base text-foreground">No items yet</EmptyTitle>
                        <EmptyDescription>Add a label and URL to create the first menu item.</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    selected_menu.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3"
                      >
                        <GripVertical className="size-4 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{item.label}</span>
                        <span className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground sm:block">{item.url}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => set_pending_delete({ kind: 'item', item, menu_id: selected_menu.id })}
                          aria-label={`Delete ${item.label}`}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <Empty className="py-12">
                <EmptyHeader>
                  <EmptyMedia className="text-muted-foreground [&_svg]:size-10">
                    <MenuSquare aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle className="text-foreground">Select a menu</EmptyTitle>
                  <EmptyDescription>Choose a menu from the left to manage its links.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={pending_delete !== null} onOpenChange={(open) => { if (!open && !deleting) set_pending_delete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{delete_dialog_title}</AlertDialogTitle>
            <AlertDialogDescription>{delete_dialog_description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handle_delete_confirmed();
              }}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

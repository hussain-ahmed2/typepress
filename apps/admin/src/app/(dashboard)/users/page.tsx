/**
 * Users Page — User management with roles and capabilities.
 *
 * Uses shadcn Table/Dialog/AlertDialog primitives and semantic theme tokens.
 */
'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Edit, Trash2, Users } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { api } from '@/lib/api_client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/** User record shape returned by the users API. */
interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
}

/** Paginated list response shape returned by users API. */
interface PaginatedUsersResponse {
  success: boolean;
  data?: User[];
  pagination?: {
    total: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

const USER_ROLES = ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'] as const;
type UserRole = (typeof USER_ROLES)[number];

function is_user_role(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

/** Validation schema for the edit-role dialog. */
const edit_user_role_schema = z.object({
  role: z.enum(USER_ROLES, { message: 'Select a valid role' }),
});

type EditUserRoleFormValues = z.infer<typeof edit_user_role_schema>;

/** Role badge styling; role colors are intentional semantic exceptions for quick scanning. */
const role_badge_classes: Record<string, string> = {
  ADMIN: 'border-destructive/20 bg-destructive/10 text-destructive',
  EDITOR: 'border-primary/20 bg-primary/10 text-primary',
  AUTHOR: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  VIEWER: 'border-border bg-muted text-muted-foreground',
};

export default function UsersPage() {
  const [users, set_users] = useState<User[]>([]);
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState<string | null>(null);
  const [editing_user, set_editing_user] = useState<User | null>(null);
  const [pending_delete_user, set_pending_delete_user] = useState<User | null>(null);
  const [deleting_user_id, set_deleting_user_id] = useState<string | null>(null);

  const {
    control: edit_role_control,
    handleSubmit: handle_edit_role_submit,
    reset: reset_edit_role_form,
    formState: { errors: edit_role_errors, isSubmitting: is_saving_role },
  } = useForm<EditUserRoleFormValues>({
    resolver: zodResolver(edit_user_role_schema),
    defaultValues: { role: 'VIEWER' },
    mode: 'onSubmit',
  });

  async function fetch_users(): Promise<void> {
    set_loading(true);
    set_error(null);

    const result = (await api.get('/api/users')) as PaginatedUsersResponse;
    if (result.success && Array.isArray(result.data)) {
      set_users(result.data);
    } else {
      set_error(result.error?.message ?? 'Failed to load users');
    }

    set_loading(false);
  }

  useEffect(() => {
    void fetch_users();
  }, []);

  // Sync dialog form when the selected user changes.
  useEffect(() => {
    if (editing_user) {
      reset_edit_role_form({ role: is_user_role(editing_user.role) ? editing_user.role : 'VIEWER' });
    }
  }, [editing_user, reset_edit_role_form]);

  /** Persists role changes for the currently edited user. */
  async function on_submit_edit_role(values: EditUserRoleFormValues): Promise<void> {
    if (!editing_user) return;

    const result = await api.put(`/api/users/${editing_user.id}`, { role: values.role });

    if (!result.success) {
      set_error(result.error?.message ?? 'Failed to update user role');
      return;
    }

    set_editing_user(null);
    toast.success('User role updated');
    await fetch_users();
  }

  async function handle_delete_user(): Promise<void> {
    if (!pending_delete_user) return;
    const user_id = pending_delete_user.id;
    set_deleting_user_id(user_id);
    const result = await api.delete(`/api/users/${user_id}`);
    set_deleting_user_id(null);

    if (!result.success) {
      set_error(result.error?.message ?? 'Failed to delete user');
      return;
    }

    set_pending_delete_user(null);
    toast.success('User deleted');
    await fetch_users();
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage accounts, roles, and access.</p>
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-4 border-destructive/20 bg-destructive/10" role="alert">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertTitle>User action failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Card className="p-4 drop-shadow">
          <div className="space-y-3" role="status" aria-live="polite" aria-label="Loading users">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </Card>
      ) : users.length === 0 ? (
        <Card className="drop-shadow">
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia className="text-muted-foreground [&_svg]:size-10">
                <Users aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle className="text-lg font-medium text-foreground">No users found</EmptyTitle>
              <EmptyDescription>User accounts will appear here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <Card className="overflow-hidden drop-shadow">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-6">User</TableHead>
                <TableHead className="px-6">Role</TableHead>
                <TableHead className="px-6">Joined</TableHead>
                <TableHead className="px-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const display_name = user.name || 'No name';
                return (
                  <TableRow key={user.id}>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Users size={18} aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{display_name}</p>
                          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={role_badge_classes[user.role] ?? 'border-border bg-muted text-muted-foreground'}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            set_editing_user(user);
                          }}
                          aria-label={`Edit role for ${display_name}`}
                        >
                          <Edit size={16} aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => set_pending_delete_user(user)}
                          aria-label={`Delete ${display_name}`}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog
        open={editing_user !== null}
        onOpenChange={(open) => {
          if (!open) set_editing_user(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              {editing_user ? `Update role for ${editing_user.name || editing_user.email}.` : 'Update user role.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handle_edit_role_submit(on_submit_edit_role)} className="space-y-4" noValidate>
            <FieldGroup className="gap-4">
              <Field data-invalid={edit_role_errors.role ? true : undefined}>
                <FieldLabel id="edit-user-role-label">Role</FieldLabel>
                <Controller
                  name="role"
                  control={edit_role_control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        if (typeof value === 'string' && is_user_role(value)) field.onChange(value);
                      }}
                    >
                      <SelectTrigger className="w-full" aria-labelledby="edit-user-role-label" aria-invalid={edit_role_errors.role ? true : undefined}>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="EDITOR">Editor</SelectItem>
                        <SelectItem value="AUTHOR">Author</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[edit_role_errors.role]} />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => set_editing_user(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={is_saving_role}>
                {is_saving_role ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pending_delete_user !== null}
        onOpenChange={(open) => {
          if (!open) set_pending_delete_user(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending_delete_user
                ? `This will permanently remove ${pending_delete_user.name || pending_delete_user.email}. This action cannot be undone.`
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting_user_id !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting_user_id !== null}
              onClick={() => {
                void handle_delete_user();
              }}
            >
              {deleting_user_id !== null ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

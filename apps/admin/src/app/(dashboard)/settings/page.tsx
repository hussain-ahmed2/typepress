/**
 * Settings Page — Site configuration backed by the settings API.
 *
 * Uses react-hook-form + zod for validation/state while preserving the existing
 * settings load/save API behavior and feedback UX.
 */
'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Globe, Loader2, Mail, Save, Shield } from 'lucide-react';
import type { SiteSettings } from '@typepress/shared-types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { api } from '@/lib/api_client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

/** Validation schema matching the SiteSettings API contract. */
const settings_schema = z.object({
  site_title: z.string().trim().min(1, 'Site title is required'),
  site_description: z.string().trim(),
  site_url: z.string().trim().url('Enter a valid URL (including https://)'),
  admin_email: z.string().trim().min(1, 'Admin email is required').email('Enter a valid email address'),
  rate_limiting_enabled: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settings_schema>;

/** Initial form values before settings are loaded from the API. */
const EMPTY_SETTINGS: SettingsFormValues = {
  site_title: '',
  site_description: '',
  site_url: '',
  admin_email: '',
  rate_limiting_enabled: true,
};

/** Renders the admin settings form with load/save feedback states. */
export default function SettingsPage() {
  const [loading, set_loading] = useState<boolean>(true);
  const [load_error, set_load_error] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settings_schema),
    defaultValues: EMPTY_SETTINGS,
    mode: 'onSubmit',
  });

  useEffect(() => {
    let cancelled = false;

    async function fetch_settings(): Promise<void> {
      set_loading(true);
      set_load_error(null);

      const result = await api.get<SiteSettings>('/api/settings');
      if (cancelled) return;

      if (result.success && result.data) {
        // Reset form with server values so RHF becomes source of truth.
        reset(result.data);
      } else {
        set_load_error(result.error?.message ?? 'Failed to load settings');
      }

      set_loading(false);
    }

    void fetch_settings();

    return () => {
      cancelled = true;
    };
  }, [reset]);

  /** Persists validated settings to the API and surfaces success/failure feedback. */
  async function on_submit(values: SettingsFormValues): Promise<void> {
    set_load_error(null);

    const result = await api.put<SiteSettings>('/api/settings', values);
    if (result.success && result.data) {
      reset(result.data);
      toast.success('Settings saved');
    } else {
      const message = result.error?.message ?? 'Failed to save settings';
      set_load_error(message);
      toast.error(message);
    }
  }

  return (
    <div className="max-w-3xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure site-wide defaults and security behavior.</p>
      </div>

      {load_error ? (
        <Alert variant="destructive" className="mb-6 border-destructive/20 bg-destructive/10">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{load_error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="space-y-6" aria-label="Loading settings" role="status">
          <Card className="rounded-md drop-shadow">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card className="rounded-md drop-shadow">
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <form onSubmit={handleSubmit(on_submit)} className="space-y-6" noValidate>
          <Card className="rounded-md drop-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="size-5 text-primary" aria-hidden="true" />
                <CardTitle className="text-lg">General</CardTitle>
              </div>
              <CardDescription>Basic information shown across the site.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="gap-4">
                <Field data-invalid={errors.site_title ? true : undefined}>
                  <FieldLabel htmlFor="site-title">Site Title</FieldLabel>
                  <Input
                    id="site-title"
                    type="text"
                    placeholder="My Typepress Site"
                    autoComplete="organization"
                    aria-invalid={errors.site_title ? true : undefined}
                    {...register('site_title')}
                  />
                  <FieldError errors={[errors.site_title]} />
                </Field>

                <Field data-invalid={errors.site_description ? true : undefined}>
                  <FieldLabel htmlFor="site-description">Site Description</FieldLabel>
                  <Input
                    id="site-description"
                    type="text"
                    placeholder="A short description of your site"
                    aria-invalid={errors.site_description ? true : undefined}
                    {...register('site_description')}
                  />
                  <FieldError errors={[errors.site_description]} />
                </Field>

                <Field data-invalid={errors.site_url ? true : undefined}>
                  <FieldLabel htmlFor="site-url">Site URL</FieldLabel>
                  <Input
                    id="site-url"
                    type="url"
                    placeholder="https://example.com"
                    autoComplete="url"
                    aria-invalid={errors.site_url ? true : undefined}
                    {...register('site_url')}
                  />
                  <FieldError errors={[errors.site_url]} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card className="rounded-md drop-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="size-5 text-primary" aria-hidden="true" />
                <CardTitle className="text-lg">Email</CardTitle>
              </div>
              <CardDescription>Administrative contact address for system notifications.</CardDescription>
            </CardHeader>
            <CardContent>
              <Field data-invalid={errors.admin_email ? true : undefined}>
                <FieldLabel htmlFor="admin-email">Admin Email</FieldLabel>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@example.com"
                  autoComplete="email"
                  aria-invalid={errors.admin_email ? true : undefined}
                  {...register('admin_email')}
                />
                <FieldError errors={[errors.admin_email]} />
              </Field>
            </CardContent>
          </Card>

          <Card className="rounded-md drop-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-primary" aria-hidden="true" />
                <CardTitle className="text-lg">Security</CardTitle>
              </div>
              <CardDescription>Controls that protect authentication endpoints.</CardDescription>
            </CardHeader>
            <CardContent>
              <Controller
                name="rate_limiting_enabled"
                control={control}
                render={({ field }) => (
                  <Field orientation="horizontal" className="items-center justify-between gap-4 rounded-md border border-border p-4">
                    <FieldContent className="gap-1">
                      <FieldLabel htmlFor="rate-limiting" className="text-sm font-medium text-foreground">
                        Rate Limiting
                      </FieldLabel>
                      <FieldDescription id="rate-limiting-description">
                        Limit login attempts to reduce brute-force risk.
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="rate-limiting"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-describedby="rate-limiting-description"
                    />
                  </Field>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="rounded-md drop-shadow-sm">
              {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

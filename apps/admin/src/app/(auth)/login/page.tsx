/**
 * Login Page — Accessible sign-in form with schema-driven validation.
 *
 * Uses react-hook-form + zod for client validation while preserving the
 * existing /api/auth/login behavior and API error feedback.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, LogIn } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/lib/api_client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

/** Validation schema for the login form. */
const login_schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

/** Inferred form values from the login schema. */
type LoginFormValues = z.infer<typeof login_schema>;

export default function LoginPage() {
  const router = useRouter();
  const [server_error, set_server_error] = useState<string>('');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(login_schema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
  });

  /** Submits credentials and routes on success, surfacing API errors inline. */
  async function on_submit(values: LoginFormValues): Promise<void> {
    set_server_error('');

    const result = await api.post('/api/auth/login', values);

    if (result.success) {
      router.push('/');
      return;
    }

    const message = result.error?.message ?? 'Login failed';
    set_server_error(message);
    // Surface server error at root; field-level mapping is not provided by API.
    setError('root.serverError', { type: 'server', message });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#f3f3f3' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#2185d5' }}>Typepress</h1>
          <p className="mt-2" style={{ color: '#3a4750' }}>Sign in to the admin panel</p>
        </div>

        <Card className="drop-shadow-md">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your credentials to access the admin panel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {server_error ? (
              <Alert variant="destructive">
                <AlertDescription>{server_error}</AlertDescription>
              </Alert>
            ) : null}

            <form onSubmit={handleSubmit(on_submit)} className="space-y-4" noValidate>
              <FieldGroup className="gap-4">
                <Field data-invalid={errors.email ? true : undefined}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@typepress.dev"
                    autoComplete="email"
                    aria-invalid={errors.email ? true : undefined}
                    {...register('email')}
                  />
                  <FieldError errors={[errors.email]} />
                </Field>

                <Field data-invalid={errors.password ? true : undefined}>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Link href="/forgot-password" className="text-sm hover:underline" style={{ color: '#2185d5' }}>
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    aria-invalid={errors.password ? true : undefined}
                    {...register('password')}
                  />
                  <FieldError errors={[errors.password]} />
                </Field>
              </FieldGroup>

              <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <p className="text-center text-sm" style={{ color: '#3a4750' }}>
              Need a new verification email?{' '}
              <Link href="/verify-email" className="hover:underline" style={{ color: '#2185d5' }}>
                Resend verification
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

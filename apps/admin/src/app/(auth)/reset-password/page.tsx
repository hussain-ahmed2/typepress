/**
 * Reset Password Page — Set a new password using a one-time token.
 *
 * Uses react-hook-form + zod for password validation and confirmation matching.
 * Token is read from the URL query string; the raw token is only sent to the API.
 */
'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/lib/api_client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface ResetPasswordResponse {
  message: string;
}

/** Validation schema enforcing password strength and confirmation match. */
const reset_password_schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must include an uppercase letter')
      .regex(/[a-z]/, 'Password must include a lowercase letter')
      .regex(/[0-9]/, 'Password must include a number'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((values) => values.password === values.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type ResetPasswordFormValues = z.infer<typeof reset_password_schema>;

function ResetPasswordForm() {
  const search_params = useSearchParams();
  const token = search_params.get('token') ?? '';
  const [server_error, set_server_error] = useState<string>('');
  const [success_message, set_success_message] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(reset_password_schema),
    defaultValues: { password: '', confirm_password: '' },
    mode: 'onSubmit',
  });

  /** Submits the new password with the URL token; clears form on success. */
  async function on_submit(values: ResetPasswordFormValues): Promise<void> {
    set_server_error('');
    set_success_message('');

    if (!token) {
      set_server_error('Reset token is missing. Please use the link from your email.');
      return;
    }

    const result = await api.post<ResetPasswordResponse>('/api/auth/reset-password', {
      token,
      password: values.password,
    });

    if (result.success) {
      set_success_message(result.data?.message ?? 'Password has been reset successfully.');
      reset();
      return;
    }

    set_server_error(result.error?.message ?? 'Unable to reset password');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#f3f3f3' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#2185d5' }}>Typepress</h1>
          <p className="mt-2" style={{ color: '#3a4750' }}>Choose a new password</p>
        </div>

        <Card className="drop-shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound size={18} />
              Reset password
            </CardTitle>
            <CardDescription>
              Use at least 8 characters with uppercase, lowercase, and a number.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!token ? (
              <Alert variant="destructive">
                <AlertDescription>
                  Reset token is missing or invalid. Request a new reset link.
                </AlertDescription>
              </Alert>
            ) : null}
            {server_error ? (
              <Alert variant="destructive">
                <AlertDescription>{server_error}</AlertDescription>
              </Alert>
            ) : null}
            {success_message ? (
              <Alert>
                <CheckCircle2 size={16} />
                <AlertDescription>{success_message}</AlertDescription>
              </Alert>
            ) : null}

            <form onSubmit={handleSubmit(on_submit)} className="space-y-4" noValidate>
              <FieldGroup className="gap-4">
                <Field data-invalid={errors.password ? true : undefined}>
                  <FieldLabel htmlFor="password">New password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={errors.password ? true : undefined}
                    {...register('password')}
                  />
                  <FieldError errors={[errors.password]} />
                </Field>

                <Field data-invalid={errors.confirm_password ? true : undefined}>
                  <FieldLabel htmlFor="confirm_password">Confirm new password</FieldLabel>
                  <Input
                    id="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={errors.confirm_password ? true : undefined}
                    {...register('confirm_password')}
                  />
                  <FieldError errors={[errors.confirm_password]} />
                </Field>
              </FieldGroup>

              <Button type="submit" className="w-full" disabled={isSubmitting || !token} aria-busy={isSubmitting}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                {isSubmitting ? 'Resetting...' : 'Reset password'}
              </Button>
            </form>

            <div className="flex items-center justify-between text-sm">
              <Link href="/forgot-password" className="hover:underline" style={{ color: '#2185d5' }}>
                Request new link
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 hover:underline" style={{ color: '#2185d5' }}>
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

/**
 * Forgot Password Page — Request a password reset email.
 *
 * Uses react-hook-form + zod for validation while preserving the generic
 * success response to avoid account enumeration.
 */
'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/lib/api_client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface ForgotPasswordResponse {
  message: string;
}

/** Validation schema for forgot-password request. */
const forgot_password_schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgot_password_schema>;

function ForgotPasswordForm() {
  const [server_error, set_server_error] = useState<string>('');
  const [success_message, set_success_message] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgot_password_schema),
    defaultValues: { email: '' },
    mode: 'onSubmit',
  });

  /** Requests a reset email; API response is intentionally generic on success. */
  async function on_submit(values: ForgotPasswordFormValues): Promise<void> {
    set_server_error('');
    set_success_message('');

    const result = await api.post<ForgotPasswordResponse>('/api/auth/forgot-password', values);

    if (result.success) {
      set_success_message(
        result.data?.message ?? 'If an account with that email exists, a password reset link has been sent.',
      );
      return;
    }

    set_server_error(result.error?.message ?? 'Unable to request password reset');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#f3f3f3' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#2185d5' }}>Typepress</h1>
          <p className="mt-2" style={{ color: '#3a4750' }}>Reset your password</p>
        </div>

        <Card className="drop-shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail size={18} />
              Forgot password
            </CardTitle>
            <CardDescription>
              Enter your email address and we&apos;ll send a reset link if an account exists.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {server_error ? (
              <Alert variant="destructive">
                <AlertDescription>{server_error}</AlertDescription>
              </Alert>
            ) : null}
            {success_message ? (
              <Alert>
                <AlertDescription>{success_message}</AlertDescription>
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
              </FieldGroup>

              <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                {isSubmitting ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>

            <div className="text-center">
              <Link href="/login" className="inline-flex items-center gap-2 text-sm hover:underline" style={{ color: '#2185d5' }}>
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

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}

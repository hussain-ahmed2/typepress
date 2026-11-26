/**
 * Verify Email Page — Confirms an email address using a one-time token.
 *
 * Also provides a resend-verification form so users can request a new link
 * without leaving the auth flow. API responses remain generic to avoid
 * account enumeration.
 */
'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2, Loader2, Mail, MailCheck, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/lib/api_client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface VerifyEmailResponse {
  message: string;
}

interface ResendVerificationResponse {
  message: string;
}

type VerifyState = 'idle' | 'loading' | 'success' | 'error';

/** Validation schema for resend-verification requests. */
const resend_verification_schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
});

type ResendVerificationFormValues = z.infer<typeof resend_verification_schema>;

function VerifyEmailContent() {
  const search_params = useSearchParams();
  const token = search_params.get('token') ?? '';
  const [state, set_state] = useState<VerifyState>('idle');
  const [message, set_message] = useState('');
  const [resend_error, set_resend_error] = useState('');
  const [resend_success, set_resend_success] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResendVerificationFormValues>({
    resolver: zodResolver(resend_verification_schema),
    defaultValues: { email: '' },
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (!token) {
      set_state('error');
      set_message('Verification token is missing. Enter your email below to request a new verification link.');
      return;
    }

    let cancelled = false;

    async function verify(): Promise<void> {
      set_state('loading');
      const result = await api.post<VerifyEmailResponse>('/api/auth/verify-email', { token });
      if (cancelled) return;

      if (result.success) {
        set_state('success');
        set_message(result.data?.message ?? 'Email verified successfully.');
        return;
      }

      set_state('error');
      set_message(result.error?.message ?? 'Unable to verify email.');
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  /** Requests another verification email; API response is intentionally generic. */
  async function on_resend(values: ResendVerificationFormValues): Promise<void> {
    set_resend_error('');
    set_resend_success('');

    const result = await api.post<ResendVerificationResponse>('/api/auth/resend-verification', values);

    if (result.success) {
      set_resend_success(
        result.data?.message ??
          'If an account with that email exists and is not verified, a verification email has been sent.',
      );
      return;
    }

    set_resend_error(result.error?.message ?? 'Unable to resend verification email');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#f3f3f3' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#2185d5' }}>Typepress</h1>
          <p className="mt-2" style={{ color: '#3a4750' }}>Email verification</p>
        </div>

        <Card className="drop-shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailCheck size={18} />
              Verify email
            </CardTitle>
            <CardDescription>
              Confirm your email address, or request a new verification link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {state === 'loading' ? (
              <Alert>
                <Loader2 size={16} className="animate-spin" />
                <AlertDescription>Verifying your email...</AlertDescription>
              </Alert>
            ) : null}

            {state === 'success' ? (
              <Alert>
                <CheckCircle2 size={16} />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}

            {state === 'error' ? (
              <Alert variant="destructive">
                <XCircle size={16} />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}

            {state !== 'success' ? (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <p className="text-sm font-medium">Resend verification email</p>
                  <p className="text-sm text-muted-foreground">
                    If your link expired or is missing, we can send another one.
                  </p>
                </div>

                {resend_error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{resend_error}</AlertDescription>
                  </Alert>
                ) : null}
                {resend_success ? (
                  <Alert>
                    <Mail size={16} />
                    <AlertDescription>{resend_success}</AlertDescription>
                  </Alert>
                ) : null}

                <form onSubmit={handleSubmit(on_resend)} className="space-y-4" noValidate>
                  <FieldGroup className="gap-4">
                    <Field data-invalid={errors.email ? true : undefined}>
                      <FieldLabel htmlFor="resend-email">Email</FieldLabel>
                      <Input
                        id="resend-email"
                        type="email"
                        placeholder="admin@typepress.dev"
                        autoComplete="email"
                        aria-invalid={errors.email ? true : undefined}
                        {...register('email')}
                      />
                      <FieldError errors={[errors.email]} />
                    </Field>
                  </FieldGroup>

                  <Button type="submit" variant="outline" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                    {isSubmitting ? 'Sending...' : 'Resend verification email'}
                  </Button>
                </form>
              </div>
            ) : null}

            <Button className="w-full" render={<Link href="/login" />} nativeButton={false}>
              <ArrowLeft size={16} />
              Go to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}

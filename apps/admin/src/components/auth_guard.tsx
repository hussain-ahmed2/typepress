/**
 * AuthGuard — Protects dashboard routes by bootstrapping the current session.
 *
 * Behavior:
 *   - Dispatches fetch_current_user on first mount when auth is idle.
 *   - Shows a loading screen while auth state is being resolved.
 *   - Redirects unauthenticated users to /login.
 *   - Renders children only when authenticated to avoid protected-content flash.
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { fetch_current_user } from '@/lib/slices/user_slice';

interface AuthGuardProps {
  children: React.ReactNode;
}

/** Full-screen auth check state shown while session bootstrap is in progress. */
function AuthLoadingScreen() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 rounded-md bg-card px-8 py-6 text-card-foreground drop-shadow">
        <LoaderCircle className="animate-spin text-primary" size={28} aria-hidden="true" />
        <p className="text-sm font-medium text-muted-foreground">Checking session...</p>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const auth_status = useAppSelector((state) => state.users.auth_status);

  // Bootstrap session once for the dashboard route group.
  useEffect(() => {
    if (auth_status === 'idle') {
      void dispatch(fetch_current_user());
    }
  }, [auth_status, dispatch]);

  // Redirect after auth check resolves to unauthenticated.
  useEffect(() => {
    if (auth_status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [auth_status, router]);

  if (auth_status !== 'authenticated') {
    return <AuthLoadingScreen />;
  }

  return <>{children}</>;
}

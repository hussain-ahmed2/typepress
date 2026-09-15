/**
 * Login Page — Accessible, responsive login form.
 *
 * Uses drop-shadow and clean button styling.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api_client';

export default function LoginPage() {
  const router = useRouter();
  const [email, set_email] = useState('');
  const [password, set_password] = useState('');
  const [error, set_error] = useState('');
  const [loading, set_loading] = useState(false);

  async function handle_submit(e: React.FormEvent) {
    e.preventDefault();
    set_error('');
    set_loading(true);

    const result = await api.post('/api/auth/login', { email, password });
    set_loading(false);

    if (result.success) {
      router.push('/');
    } else {
      set_error(result.error?.message || 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#f3f3f3' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#2185d5' }}>Typepress</h1>
          <p className="mt-2" style={{ color: '#3a4750' }}>Sign in to the admin panel</p>
        </div>

        <div className="bg-white rounded-md p-8 drop-shadow-md">
          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 text-sm"
            >
              {error}
            </div>
          )}

          <form onSubmit={handle_submit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => set_email((e.target as HTMLInputElement).value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="admin@typepress.dev"
                aria-required="true"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => set_password((e.target as HTMLInputElement).value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="••••••••"
                aria-required="true"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="flex items-center justify-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium transition-colors text-white disabled:opacity-50"
              style={{ backgroundColor: '#0284C7' }}
              aria-busy={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Login Page — Accessible, responsive login form.
 *
 * Features:
 *   - Responsive layout (works on mobile)
 *   - Keyboard navigation
 *   - ARIA labels for screen readers
 *   - Focus visible states
 *   - Error announcements for screen readers
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F8FCFB' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#6892D5' }}>Typepress</h1>
          <p className="mt-2" style={{ color: '#79D1C3' }}>Sign in to the admin panel</p>
        </div>

        <div className="bg-white rounded-lg p-8" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                aria-required="true"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full text-white py-2 rounded-lg font-medium disabled:opacity-50"
              style={{ backgroundColor: '#6892D5' }}
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

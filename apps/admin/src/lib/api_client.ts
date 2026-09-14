/**
 * API Client — Typed fetch wrapper for communicating with the Typepress API.
 *
 * Handles session cookies automatically (credentials: 'include').
 * Returns typed responses matching the ApiResponse<T> contract.
 */
import type { ApiResponse } from '@typepress/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function api_request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  return response.json();
}

export const api = {
  get: <T>(path: string) => api_request<T>(path),

  post: <T>(path: string, body: unknown) =>
    api_request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(path: string, body: unknown) =>
    api_request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string) =>
    api_request<T>(path, { method: 'DELETE' }),
};

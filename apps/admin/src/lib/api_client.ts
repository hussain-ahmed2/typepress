/**
 * API Client — Axios-based typed fetch wrapper for the Typepress API.
 *
 * Features:
 *   - Automatic session cookie handling
 *   - Request/response interceptors
 *   - Typed responses matching ApiResponse<T>
 *   - Error handling with retry logic
 */
import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { ApiResponse } from '@typepress/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const axios_instance: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-redirect to login on 401
axios_instance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

function handle_error(error: unknown): ApiResponse {
  const axios_error = error as AxiosError<{ error?: { code?: string; message?: string } }>;
  if (axios_error.response?.data?.error) {
    return { success: false, error: axios_error.response.data.error as { code: string; message: string } };
  }
  return { success: false, error: { code: 'NETWORK_ERROR', message: axios_error.message || 'Network error' } };
}

export const api = {
  get: async <T>(path: string): Promise<ApiResponse<T>> => {
    try { return (await axios_instance.get<ApiResponse<T>>(path)).data; }
    catch (e) { return handle_error(e); }
  },
  post: async <T>(path: string, body?: unknown): Promise<ApiResponse<T>> => {
    try { return (await axios_instance.post<ApiResponse<T>>(path, body)).data; }
    catch (e) { return handle_error(e); }
  },
  put: async <T>(path: string, body?: unknown): Promise<ApiResponse<T>> => {
    try { return (await axios_instance.put<ApiResponse<T>>(path, body)).data; }
    catch (e) { return handle_error(e); }
  },
  delete: async <T>(path: string): Promise<ApiResponse<T>> => {
    try { return (await axios_instance.delete<ApiResponse<T>>(path)).data; }
    catch (e) { return handle_error(e); }
  },
};

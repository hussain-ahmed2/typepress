/**
 * API Client — Axios-based typed fetch wrapper for the Typepress API.
 */
import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@typepress/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const CSRF_HEADER = 'x-csrf-token';

let csrf_token: string | null = null;
let csrf_token_promise: Promise<string | null> | null = null;

const axios_instance: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

async function fetch_csrf_token(): Promise<string | null> {
  try {
    const response = await axios_instance.get<ApiResponse<{ csrf_token: string }>>('/api/auth/csrf');
    const token = response.data?.data?.csrf_token;
    if (response.data?.success && typeof token === 'string' && token.length > 0) {
      csrf_token = token;
      return token;
    }
  } catch {
    return null;
  }
  return null;
}

async function ensure_csrf_token(): Promise<string | null> {
  if (csrf_token) return csrf_token;
  if (!csrf_token_promise) {
    csrf_token_promise = fetch_csrf_token().finally(() => {
      csrf_token_promise = null;
    });
  }
  return csrf_token_promise;
}

axios_instance.interceptors.request.use(async (request: InternalAxiosRequestConfig) => {
  const method = (request.method ?? 'get').toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return request;

  const path = request.url ?? '';
  if (path.includes('/api/auth/csrf')) return request;

  const token = await ensure_csrf_token();
  if (token) {
    request.headers.set(CSRF_HEADER, token);
  }
  return request;
});

axios_instance.interceptors.response.use(
  (response) => {
    const token = (response.data as ApiResponse<{ csrf_token?: string }> | undefined)?.data?.csrf_token;
    if (typeof token === 'string' && token.length > 0) {
      csrf_token = token;
    }
    return response;
  },
  async (error: AxiosError) => {
    const status = error.response?.status;
    const code = (error.response?.data as { error?: { code?: string } } | undefined)?.error?.code;
    const original_config = error.config as (InternalAxiosRequestConfig & { _csrf_retry?: boolean }) | undefined;

    if (status === 403 && (code === 'CSRF_TOKEN_INVALID' || code === 'CSRF_TOKEN_MISSING') && original_config && !original_config._csrf_retry) {
      original_config._csrf_retry = true;
      csrf_token = null;
      const token = await fetch_csrf_token();
      if (token) {
        original_config.headers.set(CSRF_HEADER, token);
        return axios_instance.request(original_config);
      }
    }

    if (status === 401 && typeof window !== 'undefined') {
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
  };
}

function handle_error<T>(error: unknown): ApiResponse<T> {
  const axios_error = error as AxiosError<ApiErrorPayload>;
  const response_error = axios_error.response?.data?.error;

  if (response_error?.code && response_error?.message) {
    return {
      success: false,
      error: { code: response_error.code, message: response_error.message },
    };
  }

  return {
    success: false,
    error: {
      code: 'NETWORK_ERROR',
      message: axios_error instanceof Error ? axios_error.message : 'Network error',
    },
  };
}

export const api = {
  get: async <T>(path: string): Promise<ApiResponse<T>> => {
    try {
      return (await axios_instance.get<ApiResponse<T>>(path)).data;
    } catch (error) {
      return handle_error<T>(error);
    }
  },
  post: async <T>(path: string, body?: unknown): Promise<ApiResponse<T>> => {
    try {
      return (await axios_instance.post<ApiResponse<T>>(path, body)).data;
    } catch (error) {
      return handle_error<T>(error);
    }
  },
  put: async <T>(path: string, body?: unknown): Promise<ApiResponse<T>> => {
    try {
      return (await axios_instance.put<ApiResponse<T>>(path, body)).data;
    } catch (error) {
      return handle_error<T>(error);
    }
  },
  patch: async <T>(path: string, body?: unknown): Promise<ApiResponse<T>> => {
    try {
      return (await axios_instance.patch<ApiResponse<T>>(path, body)).data;
    } catch (error) {
      return handle_error<T>(error);
    }
  },
  delete: async <T>(path: string): Promise<ApiResponse<T>> => {
    try {
      return (await axios_instance.delete<ApiResponse<T>>(path)).data;
    } catch (error) {
      return handle_error<T>(error);
    }
  },
};
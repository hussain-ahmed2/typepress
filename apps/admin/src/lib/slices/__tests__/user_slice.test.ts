/**
 * User slice auth tests — verifies session bootstrap and logout state transitions.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

const { mock_get, mock_post } = vi.hoisted(() => ({
  mock_get: vi.fn(),
  mock_post: vi.fn(),
}));

// Mock API client used by thunks; path matches the slice import alias.
vi.mock('@/lib/api_client', () => ({
  api: {
    get: mock_get,
    post: mock_post,
  },
}));

import reducer, {
  fetch_current_user,
  logout,
  logout_user,
  type UserState,
} from '@/lib/slices/user_slice';

function create_test_store(preloaded_state?: Partial<UserState>) {
  const users_state: UserState = {
    users: [],
    current_user: null,
    auth_status: 'idle',
    loading: false,
    error: null,
    ...preloaded_state,
  };

  return configureStore({
    reducer: { users: reducer },
    preloadedState: { users: users_state },
  });
}

describe('user_slice auth', () => {
  beforeEach(() => {
    mock_get.mockReset();
    mock_post.mockReset();
  });

  it('has idle auth state by default', () => {
    const store = create_test_store();
    expect(store.getState().users.auth_status).toBe('idle');
    expect(store.getState().users.current_user).toBeNull();
  });

  it('sets loading then authenticated when current user fetch succeeds', async () => {
    mock_get.mockResolvedValue({
      success: true,
      data: { user_id: 'u1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN' },
    });

    const store = create_test_store();
    const pending = store.dispatch(fetch_current_user());
    expect(store.getState().users.auth_status).toBe('loading');

    await pending;

    const state = store.getState().users;
    expect(mock_get).toHaveBeenCalledWith('/api/auth/me');
    expect(state.auth_status).toBe('authenticated');
    expect(state.current_user).toEqual({
      user_id: 'u1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN',
    });
  });

  it('sets unauthenticated when current user fetch fails', async () => {
    mock_get.mockResolvedValue({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
    });

    const store = create_test_store({ auth_status: 'loading' });
    await store.dispatch(fetch_current_user());

    const state = store.getState().users;
    expect(state.auth_status).toBe('unauthenticated');
    expect(state.current_user).toBeNull();
  });

  it('clears auth state on logout_user success', async () => {
    mock_post.mockResolvedValue({ success: true, data: { message: 'Logged out' } });

    const store = create_test_store({
      auth_status: 'authenticated',
      current_user: { user_id: 'u1', email: 'a@b.com', name: 'A', role: 'ADMIN' },
    });

    await store.dispatch(logout_user());

    const state = store.getState().users;
    expect(mock_post).toHaveBeenCalledWith('/api/auth/logout');
    expect(state.auth_status).toBe('unauthenticated');
    expect(state.current_user).toBeNull();
  });

  it('clears auth state on logout_user failure as safety fallback', async () => {
    mock_post.mockResolvedValue({
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Network error' },
    });

    const store = create_test_store({
      auth_status: 'authenticated',
      current_user: { user_id: 'u1', email: 'a@b.com', name: 'A', role: 'ADMIN' },
    });

    await store.dispatch(logout_user());

    const state = store.getState().users;
    expect(state.auth_status).toBe('unauthenticated');
    expect(state.current_user).toBeNull();
  });

  it('logout reducer clears local auth state', () => {
    const store = create_test_store({
      auth_status: 'authenticated',
      current_user: { user_id: 'u1', email: 'a@b.com', name: 'A', role: 'ADMIN' },
    });

    store.dispatch(logout());

    const state = store.getState().users;
    expect(state.auth_status).toBe('unauthenticated');
    expect(state.current_user).toBeNull();
  });
});

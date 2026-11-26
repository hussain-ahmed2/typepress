/**
 * User Slice — Manages user and auth session state in Redux.
 *
 * Auth lifecycle:
 *   idle -> loading (bootstrap) -> authenticated | unauthenticated
 *   authenticated -> unauthenticated (logout)
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api_client';

/** User record returned by admin user-management endpoints. */
interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
}

/** Authenticated user profile returned by /api/auth/me. */
export interface CurrentUser {
  user_id: string;
  email: string;
  name: string | null;
  role: string;
}

/** Auth bootstrap/check status for route guarding. */
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface UserState {
  users: User[];
  current_user: CurrentUser | null;
  auth_status: AuthStatus;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  users: [],
  current_user: null,
  auth_status: 'idle',
  loading: false,
  error: null,
};

export const fetch_users = createAsyncThunk('users/fetch', async () => {
  const result = await api.get<{ data: User[] }>('/api/users');
  return result.data;
});

/** Fetch the current session user. Rejects when unauthenticated or request fails. */
export const fetch_current_user = createAsyncThunk<CurrentUser, void, { rejectValue: string }>(
  'users/fetchCurrent',
  async (_, { rejectWithValue }) => {
    const result = await api.get<CurrentUser>('/api/auth/me');
    if (!result.success || !result.data) {
      return rejectWithValue(result.error?.message ?? 'Not authenticated');
    }
    return result.data;
  },
);

/** End the current session on the server and clear client auth state. */
export const logout_user = createAsyncThunk<void, void, { rejectValue: string }>(
  'users/logout',
  async (_, { rejectWithValue }) => {
    const result = await api.post<{ message: string }>('/api/auth/logout');
    if (!result.success) {
      return rejectWithValue(result.error?.message ?? 'Logout failed');
    }
  },
);

const user_slice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    /** Clear local auth state immediately (used as a safety fallback). */
    logout: (state) => {
      state.current_user = null;
      state.auth_status = 'unauthenticated';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetch_users.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetch_users.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload?.data || [];
      })
      .addCase(fetch_users.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch users';
      })
      .addCase(fetch_current_user.pending, (state) => {
        state.auth_status = 'loading';
        state.error = null;
      })
      .addCase(fetch_current_user.fulfilled, (state, action) => {
        state.auth_status = 'authenticated';
        state.current_user = action.payload;
      })
      .addCase(fetch_current_user.rejected, (state) => {
        state.auth_status = 'unauthenticated';
        state.current_user = null;
      })
      .addCase(logout_user.fulfilled, (state) => {
        state.auth_status = 'unauthenticated';
        state.current_user = null;
      })
      .addCase(logout_user.rejected, (state) => {
        // Clear local state even if server logout request fails.
        state.auth_status = 'unauthenticated';
        state.current_user = null;
      });
  },
});

export const { logout } = user_slice.actions;
export default user_slice.reducer;

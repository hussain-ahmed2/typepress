/**
 * User Slice — Manages user state in Redux.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api_client';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
}

export interface UserState {
  users: User[];
  current_user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  users: [],
  current_user: null,
  loading: false,
  error: null,
};

export const fetch_users = createAsyncThunk('users/fetch', async () => {
  const result = await api.get<{ data: User[] }>('/api/users');
  return result.data;
});

export const fetch_current_user = createAsyncThunk('users/fetchCurrent', async () => {
  const result = await api.get<{ data: User }>('/api/auth/me');
  return result.data;
});

const user_slice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    logout: (state) => {
      state.current_user = null;
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
      .addCase(fetch_current_user.fulfilled, (state, action) => {
        state.current_user = action.payload?.data || null;
      });
  },
});

export const { logout } = user_slice.actions;
export default user_slice.reducer;

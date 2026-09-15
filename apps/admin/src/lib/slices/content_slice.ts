/**
 * Content Slice — Manages content state in Redux.
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/lib/api_client';

interface ContentItem {
  id: string;
  type: string;
  slug: string;
  title: string;
  status: string;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentState {
  items: ContentItem[];
  current: ContentItem | null;
  loading: boolean;
  error: string | null;
  page: number;
  limit: number;
  total: number;
}

const initialState: ContentState = {
  items: [],
  current: null,
  loading: false,
  error: null,
  page: 1,
  limit: 20,
  total: 0,
};

export const fetch_content = createAsyncThunk(
  'content/fetch',
  async (params: { page?: number; type?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.type) query.set('type', params.type);
    if (params.status) query.set('status', params.status);

    const result = await api.get<{ data: ContentItem[]; pagination: { total: number } }>(
      `/api/content?${query.toString()}`,
    );
    return result.data;
  },
);

export const fetch_content_by_id = createAsyncThunk(
  'content/fetchById',
  async (id: string) => {
    const result = await api.get<{ data: ContentItem }>(`/api/content/${id}`);
    return result.data;
  },
);

const content_slice = createSlice({
  name: 'content',
  initialState,
  reducers: {
    clear_current: (state) => {
      state.current = null;
    },
    set_page: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetch_content.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetch_content.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload?.data || [];
        state.total = action.payload?.pagination?.total || 0;
      })
      .addCase(fetch_content.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch content';
      })
      .addCase(fetch_content_by_id.fulfilled, (state, action) => {
        state.current = action.payload?.data || null;
      });
  },
});

export const { clear_current, set_page } = content_slice.actions;
export default content_slice.reducer;

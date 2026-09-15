/**
 * Menu Slice — Manages menu state in Redux.
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/lib/api_client';

interface MenuItem {
  id: string;
  label: string;
  url: string;
  target: string | null;
  parent_id: string | null;
  order: number;
  children: MenuItem[];
}

interface Menu {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  items: MenuItem[];
}

export interface MenuState {
  menus: Menu[];
  selected: Menu | null;
  loading: boolean;
  error: string | null;
}

const initialState: MenuState = {
  menus: [],
  selected: null,
  loading: false,
  error: null,
};

export const fetch_menus = createAsyncThunk('menus/fetch', async () => {
  const result = await api.get<{ data: Menu[] }>('/api/menus');
  return result.data;
});

const menu_slice = createSlice({
  name: 'menus',
  initialState,
  reducers: {
    select_menu: (state, action: PayloadAction<Menu | null>) => {
      state.selected = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetch_menus.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetch_menus.fulfilled, (state, action) => {
        state.loading = false;
        state.menus = action.payload?.data || [];
      })
      .addCase(fetch_menus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch menus';
      });
  },
});

export const { select_menu } = menu_slice.actions;
export default menu_slice.reducer;

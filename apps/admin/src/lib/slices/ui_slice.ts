/**
 * UI Slice — Manages UI state (sidebar, modals, notifications).
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface UIState {
  sidebar_collapsed: boolean;
  notifications: Notification[];
  modal_open: boolean;
  modal_content: string | null;
}

const initialState: UIState = {
  sidebar_collapsed: false,
  notifications: [],
  modal_open: false,
  modal_content: null,
};

const ui_slice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggle_sidebar: (state) => {
      state.sidebar_collapsed = !state.sidebar_collapsed;
    },
    add_notification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      const id = Date.now().toString();
      state.notifications.push({ ...action.payload, id });
      // Auto-remove after 5 seconds
      setTimeout(() => {
        state.notifications = state.notifications.filter((n) => n.id !== id);
      }, 5000);
    },
    remove_notification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    open_modal: (state, action: PayloadAction<string>) => {
      state.modal_open = true;
      state.modal_content = action.payload;
    },
    close_modal: (state) => {
      state.modal_open = false;
      state.modal_content = null;
    },
  },
});

export const { toggle_sidebar, add_notification, remove_notification, open_modal, close_modal } = ui_slice.actions;
export default ui_slice.reducer;

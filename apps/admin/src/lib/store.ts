/**
 * Redux Store — Central state management for the admin panel.
 *
 * Features:
 *   - Typed store with Redux Toolkit
 *   - Slices for content, menus, users, media, settings
 *   - Async thunks for API calls
 */
import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import content_slice from './slices/content_slice';
import menu_slice from './slices/menu_slice';
import user_slice from './slices/user_slice';
import ui_slice from './slices/ui_slice';

export const store = configureStore({
  reducer: {
    content: content_slice,
    menus: menu_slice,
    users: user_slice,
    ui: ui_slice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

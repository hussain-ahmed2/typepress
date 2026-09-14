import { z } from 'zod';

export const create_menu_schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  location: z.string().optional(),
});

export const update_menu_schema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  location: z.string().nullable().optional(),
});

export const create_menu_item_schema = z.object({
  label: z.string().min(1),
  url: z.string().min(1),
  target: z.string().optional(),
  parent_id: z.string().optional(),
  order: z.number().int().optional().default(0),
});

export type CreateMenuInput = z.infer<typeof create_menu_schema>;
export type UpdateMenuInput = z.infer<typeof update_menu_schema>;
export type CreateMenuItemInput = z.infer<typeof create_menu_item_schema>;

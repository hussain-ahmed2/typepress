import { randomUUID } from 'node:crypto';
import { asc, count, eq, inArray } from 'drizzle-orm';
import { db, menu_items, menus } from '@typepress/db';
import type { ApiResponse } from '@typepress/shared-types';
import type { CreateMenuInput, UpdateMenuInput, CreateMenuItemInput } from './menu.validators';

/** Menu item row shape returned by Drizzle queries. */
interface MenuItemRow {
  id: string;
  menu_id: string;
  label: string;
  url: string;
  target: string | null;
  parent_id: string | null;
  order: number;
}

export class MenuService {
  /** Attach nested children to each menu item, preserving Prisma include shape. */
  private with_children(items: MenuItemRow[]): Array<MenuItemRow & { children: MenuItemRow[] }> {
    const by_parent = new Map<string, MenuItemRow[]>();
    for (const item of items) {
      if (!item.parent_id) continue;
      const siblings = by_parent.get(item.parent_id) ?? [];
      siblings.push(item);
      by_parent.set(item.parent_id, siblings);
    }

    return items.map((item) => ({
      ...item,
      children: by_parent.get(item.id) ?? [],
    }));
  }

  async list(): Promise<ApiResponse> {
    const menu_rows = await db
      .select()
      .from(menus)
      .orderBy(asc(menus.name));

    const menu_ids = menu_rows.map((menu) => menu.id);
    const counts = menu_ids.length > 0
      ? await db
          .select({ menu_id: menu_items.menu_id, items: count(menu_items.id) })
          .from(menu_items)
          .where(inArray(menu_items.menu_id, menu_ids))
          .groupBy(menu_items.menu_id)
      : [];

    const count_by_menu = new Map<string, number>();
    for (const row of counts) {
      count_by_menu.set(row.menu_id, Number(row.items));
    }

    const data = menu_rows.map((menu) => ({
      ...menu,
      _count: { items: count_by_menu.get(menu.id) ?? 0 },
    }));

    return { success: true, data };
  }

  async get_by_id(id: string): Promise<ApiResponse> {
    const [menu] = await db
      .select()
      .from(menus)
      .where(eq(menus.id, id))
      .limit(1);

    if (!menu) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Menu not found' } };
    }

    const items = await db
      .select()
      .from(menu_items)
      .where(eq(menu_items.menu_id, id))
      .orderBy(asc(menu_items.order));

    return { success: true, data: { ...menu, items: this.with_children(items) } };
  }

  async create(data: CreateMenuInput): Promise<ApiResponse> {
    const [existing] = await db
      .select({ id: menus.id })
      .from(menus)
      .where(eq(menus.slug, data.slug))
      .limit(1);
    if (existing) {
      return { success: false, error: { code: 'CONFLICT', message: 'Slug already exists' } };
    }

    const [menu] = await db
      .insert(menus)
      .values({
        id: randomUUID(),
        name: data.name,
        slug: data.slug,
        location: data.location ?? null,
      })
      .returning();

    return { success: true, data: menu };
  }

  async update(id: string, data: UpdateMenuInput): Promise<ApiResponse> {
    const [existing] = await db
      .select({ id: menus.id })
      .from(menus)
      .where(eq(menus.id, id))
      .limit(1);
    if (!existing) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Menu not found' } };
    }

    const update_data: Partial<{ name: string; slug: string; location: string | null }> = {};
    if (data.name !== undefined) update_data.name = data.name;
    if (data.slug !== undefined) update_data.slug = data.slug;
    if (data.location !== undefined) update_data.location = data.location;

    if (Object.keys(update_data).length === 0) {
      const [current] = await db.select().from(menus).where(eq(menus.id, id)).limit(1);
      return { success: true, data: current ?? null };
    }

    const [menu] = await db
      .update(menus)
      .set(update_data)
      .where(eq(menus.id, id))
      .returning();

    return { success: true, data: menu };
  }

  async delete(id: string): Promise<ApiResponse> {
    const [deleted] = await db
      .delete(menus)
      .where(eq(menus.id, id))
      .returning({ id: menus.id });
    if (!deleted) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Menu not found' } };
    }

    return { success: true, data: { message: 'Menu deleted' } };
  }

  async add_item(menu_id: string, data: CreateMenuItemInput): Promise<ApiResponse> {
    const [menu] = await db
      .select({ id: menus.id })
      .from(menus)
      .where(eq(menus.id, menu_id))
      .limit(1);
    if (!menu) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Menu not found' } };
    }

    const [item] = await db
      .insert(menu_items)
      .values({
        id: randomUUID(),
        menu_id,
        label: data.label,
        url: data.url,
        target: data.target ?? null,
        parent_id: data.parent_id ?? null,
        order: data.order ?? 0,
      })
      .returning();

    return { success: true, data: item };
  }

  async delete_item(id: string): Promise<ApiResponse> {
    const [deleted] = await db
      .delete(menu_items)
      .where(eq(menu_items.id, id))
      .returning({ id: menu_items.id });
    if (!deleted) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Menu item not found' } };
    }

    return { success: true, data: { message: 'Menu item deleted' } };
  }
}

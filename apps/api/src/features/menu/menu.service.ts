import { prisma } from '@typepress/db';
import type { ApiResponse } from '@typepress/shared-types';
import type { CreateMenuInput, UpdateMenuInput, CreateMenuItemInput } from './menu.validators';

export class MenuService {
  async list(): Promise<ApiResponse> {
    const menus = await prisma.menu.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { items: true } } },
    });
    return { success: true, data: menus };
  }

  async get_by_id(id: string): Promise<ApiResponse> {
    const menu = await prisma.menu.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: {
            children: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    if (!menu) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Menu not found' } };
    }

    return { success: true, data: menu };
  }

  async create(data: CreateMenuInput): Promise<ApiResponse> {
    const existing = await prisma.menu.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return { success: false, error: { code: 'CONFLICT', message: 'Slug already exists' } };
    }

    const menu = await prisma.menu.create({ data });
    return { success: true, data: menu };
  }

  async update(id: string, data: UpdateMenuInput): Promise<ApiResponse> {
    const existing = await prisma.menu.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Menu not found' } };
    }

    const menu = await prisma.menu.update({ where: { id }, data });
    return { success: true, data: menu };
  }

  async delete(id: string): Promise<ApiResponse> {
    const existing = await prisma.menu.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Menu not found' } };
    }

    await prisma.menu.delete({ where: { id } });
    return { success: true, data: { message: 'Menu deleted' } };
  }

  async add_item(menu_id: string, data: CreateMenuItemInput): Promise<ApiResponse> {
    const menu = await prisma.menu.findUnique({ where: { id: menu_id } });
    if (!menu) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Menu not found' } };
    }

    const item = await prisma.menuItem.create({
      data: { menu_id, ...data },
    });
    return { success: true, data: item };
  }

  async delete_item(id: string): Promise<ApiResponse> {
    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Menu item not found' } };
    }

    await prisma.menuItem.delete({ where: { id } });
    return { success: true, data: { message: 'Menu item deleted' } };
  }
}

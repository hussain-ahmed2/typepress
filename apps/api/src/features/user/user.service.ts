import { prisma } from '@typepress/db';
import type { ApiResponse, PaginatedResponse } from '@typepress/shared-types';
import type { UpdateUserInput, ListUsersQuery } from './user.validators';

interface UserListItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: Date;
}

export class UserService {
  async list(query: ListUsersQuery): Promise<PaginatedResponse<UserListItem>> {
    const { page, limit, role } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (role) where.role = role;

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: { id: true, email: true, name: true, role: true, created_at: true },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      success: true,
      data: items,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }

  async get_by_id(id: string): Promise<ApiResponse> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, capabilities: true, created_at: true, updated_at: true },
    });

    if (!user) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } };
    }

    return { success: true, data: user };
  }

  async update(id: string, data: UpdateUserInput): Promise<ApiResponse> {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } };
    }

    const update_data: Record<string, unknown> = {};
    if (data.name !== undefined) update_data.name = data.name;
    if (data.email !== undefined) update_data.email = data.email;
    if (data.role !== undefined) update_data.role = data.role;
    if (data.capabilities !== undefined) update_data.capabilities = data.capabilities;

    const user = await prisma.user.update({
      where: { id },
      data: update_data,
      select: { id: true, email: true, name: true, role: true, created_at: true },
    });

    return { success: true, data: user };
  }

  async delete(id: string): Promise<ApiResponse> {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } };
    }

    await prisma.user.delete({ where: { id } });
    return { success: true, data: { message: 'User deleted' } };
  }
}

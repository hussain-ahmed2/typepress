import { count, desc, eq } from 'drizzle-orm';
import { db, users } from '@typepress/db';
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
    const offset = (page - 1) * limit;

    const where_clause = role ? eq(users.role, role) : undefined;

    const [items, total_result] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          created_at: users.created_at,
        })
        .from(users)
        .where(where_clause)
        .orderBy(desc(users.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(users).where(where_clause),
    ]);

    const total = total_result[0]?.value ?? 0;

    return {
      success: true,
      data: items,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }

  async get_by_id(id: string): Promise<ApiResponse> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        capabilities: users.capabilities,
        created_at: users.created_at,
        updated_at: users.updated_at,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } };
    }

    return { success: true, data: user };
  }

  async update(id: string, data: UpdateUserInput): Promise<ApiResponse> {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
    if (!existing) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } };
    }

    // Build typed update payload; only include fields explicitly provided.
    const update_data: Partial<Pick<typeof users.$inferInsert, 'name' | 'email' | 'role' | 'capabilities'>> = {};
    if (data.name !== undefined) update_data.name = data.name;
    if (data.email !== undefined) update_data.email = data.email;
    if (data.role !== undefined) update_data.role = data.role;
    if (data.capabilities !== undefined) update_data.capabilities = data.capabilities;

    const [user] = await db
      .update(users)
      .set(update_data)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        created_at: users.created_at,
      });

    return { success: true, data: user };
  }

  async delete(id: string): Promise<ApiResponse> {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
    if (!existing) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } };
    }

    await db.delete(users).where(eq(users.id, id));
    return { success: true, data: { message: 'User deleted' } };
  }
}

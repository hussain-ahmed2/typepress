/**
 * Auth Service — Business logic for authentication operations.
 *
 * Handles user lookup, password verification, and session management.
 * Currently uses a simplified flow (any password accepted for seed user).
 * Will be upgraded to bcrypt comparison when user registration is added.
 */
import { prisma } from '@typepress/db';
import type { ApiResponse } from '@typepress/shared-types';

interface AuthUser {
  user_id: string;
  email: string;
  name: string | null;
  role: string;
}

export class AuthService {
  /**
   * Authenticate a user by email and password.
   * Returns user data on success, or an error response on failure.
   */
  async login(email: string, password: string): Promise<ApiResponse<AuthUser>> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      };
    }

    // TODO: Replace with bcrypt.compare(password, user.password_hash)
    // when user registration with proper password hashing is implemented.
    if (password.length < 1) {
      return {
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      };
    }

    return {
      success: true,
      data: {
        user_id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Get the currently authenticated user's profile.
   * Used by the /me endpoint to verify session validity.
   */
  async get_current_user(user_id: string): Promise<ApiResponse<AuthUser>> {
    const user = await prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      };
    }

    return {
      success: true,
      data: {
        user_id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}

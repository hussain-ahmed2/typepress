/**
 * Auth Service — Business logic for authentication operations.
 *
 * Security features:
 *   - bcrypt password hashing (cost factor 12)
 *   - Account lockout after 5 failed attempts (15-minute window)
 *   - Password complexity validation
 *   - Constant-time comparison via bcrypt
 */
import { prisma } from '@typepress/db';
import type { ApiResponse } from '@typepress/shared-types';
import bcrypt from 'bcrypt';

const BCRYPT_COST = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface AuthUser {
  user_id: string;
  email: string;
  name: string | null;
  role: string;
}

interface LoginAttempt {
  email: string;
  timestamp: number;
  success: boolean;
}

// In-memory rate limiting for login attempts
const login_attempts = new Map<string, LoginAttempt[]>();

export class AuthService {
  /** Hash a password using bcrypt with the configured cost factor. */
  async hash_password(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_COST);
  }

  /** Verify a password against a bcrypt hash. */
  async verify_password(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /** Validate password complexity (min 8 chars, 1 upper, 1 lower, 1 number). */
  validate_password_strength(password: string): { valid: boolean; error?: string } {
    if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters' };
    if (!/[A-Z]/.test(password)) return { valid: false, error: 'Password must contain at least one uppercase letter' };
    if (!/[a-z]/.test(password)) return { valid: false, error: 'Password must contain at least one lowercase letter' };
    if (!/[0-9]/.test(password)) return { valid: false, error: 'Password must contain at least one number' };
    return { valid: true };
  }

  /** Check if an account is locked due to too many failed login attempts. */
  is_account_locked(email: string): boolean {
    const attempts = login_attempts.get(email) ?? [];
    const recent_failures = attempts.filter(
      (a) => !a.success && Date.now() - a.timestamp < LOCKOUT_DURATION_MS,
    );
    return recent_failures.length >= MAX_LOGIN_ATTEMPTS;
  }

  /** Record a login attempt (success or failure). */
  record_login_attempt(email: string, success: boolean): void {
    const attempts = login_attempts.get(email) ?? [];
    attempts.push({ email, timestamp: Date.now(), success });
    const one_hour_ago = Date.now() - 60 * 60 * 1000;
    login_attempts.set(email, attempts.filter((a) => a.timestamp > one_hour_ago));
  }

  /** Authenticate a user by email and password. */
  async login(email: string, password: string): Promise<ApiResponse<AuthUser>> {
    if (this.is_account_locked(email)) {
      this.record_login_attempt(email, false);
      return {
        success: false,
        error: { code: 'ACCOUNT_LOCKED', message: 'Account locked due to too many failed attempts. Try again in 15 minutes.' },
      };
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      this.record_login_attempt(email, false);
      return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } };
    }

    const password_valid = await this.verify_password(password, user.password_hash);

    if (!password_valid) {
      this.record_login_attempt(email, false);
      return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } };
    }

    this.record_login_attempt(email, true);

    return {
      success: true,
      data: { user_id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  /** Get the currently authenticated user's profile. */
  async get_current_user(user_id: string): Promise<ApiResponse<AuthUser>> {
    const user = await prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } };

    return {
      success: true,
      data: { user_id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  /** Register a new user with password validation and hashing. */
  async register(email: string, name: string, password: string): Promise<ApiResponse<AuthUser>> {
    const password_check = this.validate_password_strength(password);
    if (!password_check.valid) {
      return { success: false, error: { code: 'WEAK_PASSWORD', message: password_check.error! } };
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { success: false, error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' } };
    }

    const password_hash = await this.hash_password(password);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password_hash,
        role: 'AUTHOR',
        capabilities: ['content:create', 'content:edit:own', 'media:upload'],
      },
    });

    return {
      success: true,
      data: { user_id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }
}

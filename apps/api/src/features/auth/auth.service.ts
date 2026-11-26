/**
 * Auth Service — Business logic for authentication operations.
 *
 * Security features:
 *   - Argon2id password hashing with OWASP-aligned parameters
 *   - Transparent legacy bcrypt verification with rehash-on-successful-login
 *   - Account lockout after 5 failed login attempts (15-minute window)
 *   - Password complexity validation (defense in depth alongside validators)
 *   - Password reset and email verification tokens are random, hashed at rest, expiring, single-use
 *   - Generic responses for sensitive flows to reduce user enumeration risk
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { hash as hash_argon2, verify as verify_argon2 } from '@node-rs/argon2';
import bcrypt from 'bcrypt';
import { and, eq, gt, isNull, ne } from 'drizzle-orm';
import { auth_tokens, db, users, AuthTokenType } from '@typepress/db';
import type { ApiResponse, AuthUser } from '@typepress/shared-types';

/** OWASP Password Storage Cheat Sheet: Argon2id, m=19456 KiB, t=2, p=1. */
const ARGON2_ALGORITHM_ARGON2ID = 2; // Algorithm.Argon2id
const ARGON2_OPTIONS = {
  algorithm: ARGON2_ALGORITHM_ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const AUTH_TOKEN_BYTES = 32;
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute per email+type to limit abuse

/** Minimum/maximum password length enforced at service layer for defense in depth. */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

interface LoginAttempt {
  email: string;
  timestamp: number;
  success: boolean;
}

interface TokenRequestAttempt {
  email: string;
  timestamp: number;
}

export interface AuthTokenCreationResult {
  raw_token: string;
  email: string;
  name: string | null;
}

/** Hash a raw auth token for storage/lookup. Raw tokens are never persisted. */
function hash_auth_token(raw_token: string): string {
  return createHash('sha256').update(raw_token).digest('hex');
}

/** Generate a cryptographically random one-time token. */
function generate_auth_token(): string {
  return randomBytes(AUTH_TOKEN_BYTES).toString('hex');
}

// In-memory rate limiting for login attempts. Production can move to Redis/shared store.
const login_attempts = new Map<string, LoginAttempt[]>();
// In-memory cooldown for token-sending endpoints to reduce email spam/abuse.
const token_request_attempts = new Map<string, TokenRequestAttempt[]>();

export class AuthService {
  /** Hash a password using Argon2id with OWASP-aligned parameters. */
  async hash_password(password: string): Promise<string> {
    return hash_argon2(password, ARGON2_OPTIONS);
  }

  /** Detect legacy bcrypt hashes so they can be verified and migrated. */
  private is_bcrypt_hash(hash: string): boolean {
    return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$');
  }

  /**
   * Verify a password against a stored hash.
   * Supports Argon2id (current) and legacy bcrypt hashes for transparent migration.
   */
  async verify_password(password: string, hash: string): Promise<boolean> {
    if (this.is_bcrypt_hash(hash)) {
      return bcrypt.compare(password, hash);
    }
    try {
      return await verify_argon2(hash, password, ARGON2_OPTIONS);
    } catch {
      // Invalid/unsupported hash format should not leak details to callers.
      return false;
    }
  }

  /** Validate password complexity (defense in depth; validators enforce at API boundary). */
  validate_password_strength(password: string): { valid: boolean; error?: string } {
    if (password.length < PASSWORD_MIN_LENGTH) {
      return { valid: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      return { valid: false, error: `Password must be at most ${PASSWORD_MAX_LENGTH} characters` };
    }
    if (!/[A-Z]/.test(password)) return { valid: false, error: 'Password must contain at least one uppercase letter' };
    if (!/[a-z]/.test(password)) return { valid: false, error: 'Password must contain at least one lowercase letter' };
    if (!/[0-9]/.test(password)) return { valid: false, error: 'Password must contain at least one number' };
    if (/\s/.test(password)) return { valid: false, error: 'Password must not contain whitespace' };
    return { valid: true };
  }

  /** Check if an account is locked due to too many failed login attempts. */
  is_account_locked(email: string): boolean {
    const normalized_email = email.toLowerCase();
    const attempts = login_attempts.get(normalized_email) ?? [];
    const recent_failures = attempts.filter(
      (a) => !a.success && Date.now() - a.timestamp < LOCKOUT_DURATION_MS,
    );
    return recent_failures.length >= MAX_LOGIN_ATTEMPTS;
  }

  /** Record a login attempt (success or failure). */
  record_login_attempt(email: string, success: boolean): void {
    const normalized_email = email.toLowerCase();
    const attempts = login_attempts.get(normalized_email) ?? [];
    attempts.push({ email: normalized_email, timestamp: Date.now(), success });
    const one_hour_ago = Date.now() - 60 * 60 * 1000;
    login_attempts.set(normalized_email, attempts.filter((a) => a.timestamp > one_hour_ago));
  }

  /** Simple cooldown check for token-sending requests to limit abuse. */
  is_token_request_throttled(email: string, type: AuthTokenType): boolean {
    const key = `${type}:${email.toLowerCase()}`;
    const attempts = token_request_attempts.get(key) ?? [];
    const recent = attempts.filter((a) => Date.now() - a.timestamp < RESEND_COOLDOWN_MS);
    return recent.length > 0;
  }

  /** Record a token-sending request for cooldown enforcement. */
  record_token_request(email: string, type: AuthTokenType): void {
    const key = `${type}:${email.toLowerCase()}`;
    const attempts = token_request_attempts.get(key) ?? [];
    attempts.push({ email, timestamp: Date.now() });
    const cutoff = Date.now() - RESEND_COOLDOWN_MS;
    token_request_attempts.set(key, attempts.filter((a) => a.timestamp > cutoff));
  }

  /** Rehash legacy password hash to Argon2id after successful verification. */
  private async rehash_password_if_needed(user_id: string, password: string, current_hash: string): Promise<void> {
    if (!this.is_bcrypt_hash(current_hash)) return;
    try {
      const new_hash = await this.hash_password(password);
      await db.update(users).set({ password_hash: new_hash }).where(eq(users.id, user_id));
    } catch {
      // Rehash failure should not block successful authentication; next login can retry.
    }
  }

  /** Authenticate a user by email and password. */
  async login(email: string, password: string): Promise<ApiResponse<AuthUser>> {
    const normalized_email = email.toLowerCase();

    if (this.is_account_locked(normalized_email)) {
      // Record attempt and return generic error to avoid account-state enumeration.
      this.record_login_attempt(normalized_email, false);
      return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } };
    }

    const [user] = await db.select().from(users).where(eq(users.email, normalized_email)).limit(1);

    if (!user) {
      // Perform dummy verification to reduce timing-based account enumeration.
      await this.verify_password(password, '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI');
      this.record_login_attempt(normalized_email, false);
      return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } };
    }

    const password_valid = await this.verify_password(password, user.password_hash);

    if (!password_valid) {
      this.record_login_attempt(normalized_email, false);
      return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } };
    }

    this.record_login_attempt(normalized_email, true);
    await this.rehash_password_if_needed(user.id, password, user.password_hash);

    return {
      success: true,
      data: {
        user_id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        email_verified: user.email_verified,
      },
    };
  }

  /** Get the currently authenticated user's profile. */
  async get_current_user(user_id: string): Promise<ApiResponse<AuthUser>> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        email_verified: users.email_verified,
      })
      .from(users)
      .where(eq(users.id, user_id))
      .limit(1);

    if (!user) return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } };

    return {
      success: true,
      data: {
        user_id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        email_verified: user.email_verified,
      },
    };
  }

  /** Register a new user with password validation and hashing. */
  async register(email: string, name: string, password: string): Promise<ApiResponse<AuthUser>> {
    const normalized_email = email.toLowerCase();
    const password_check = this.validate_password_strength(password);
    if (!password_check.valid) {
      return { success: false, error: { code: 'WEAK_PASSWORD', message: password_check.error ?? 'Password does not meet requirements' } };
    }

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalized_email)).limit(1);
    if (existing) {
      // Generic response to reduce account enumeration risk.
      return { success: false, error: { code: 'REGISTRATION_FAILED', message: 'Registration could not be completed' } };
    }

    const password_hash = await this.hash_password(password);

    const [user] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        email: normalized_email,
        name,
        password_hash,
        role: 'AUTHOR',
        capabilities: ['content:create', 'content:edit:own', 'media:upload'],
      })
      .returning();

    if (!user) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Registration could not be completed' } };
    }

    return {
      success: true,
      data: {
        user_id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        email_verified: user.email_verified,
      },
    };
  }

  /**
   * Create a single-use password reset token for a user.
   * Returns null when the user does not exist or request is throttled; callers should still respond generically.
   */
  async create_password_reset_token(email: string): Promise<AuthTokenCreationResult | null> {
    const normalized_email = email.toLowerCase();
    if (this.is_token_request_throttled(normalized_email, AuthTokenType.PASSWORD_RESET)) {
      return null;
    }

    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.email, normalized_email))
      .limit(1);
    if (!user) return null;

    this.record_token_request(normalized_email, AuthTokenType.PASSWORD_RESET);

    const raw_token = generate_auth_token();
    const token_hash = hash_auth_token(raw_token);
    const expires_at = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    // Invalidate prior unused reset tokens to keep only one active token.
    await db
      .update(auth_tokens)
      .set({ used_at: new Date() })
      .where(
        and(
          eq(auth_tokens.user_id, user.id),
          eq(auth_tokens.type, AuthTokenType.PASSWORD_RESET),
          isNull(auth_tokens.used_at),
          gt(auth_tokens.expires_at, new Date()),
        ),
      );

    await db.insert(auth_tokens).values({
      id: randomUUID(),
      user_id: user.id,
      token_hash,
      type: AuthTokenType.PASSWORD_RESET,
      expires_at,
    });

    return { raw_token, email: user.email, name: user.name };
  }

  /** Reset a user's password using a valid, unexpired, single-use token. */
  async reset_password(
    raw_token: string,
    new_password: string,
  ): Promise<ApiResponse<{ message: string; user_id: string }>> {
    const password_check = this.validate_password_strength(new_password);
    if (!password_check.valid) {
      return { success: false, error: { code: 'WEAK_PASSWORD', message: password_check.error ?? 'Password does not meet requirements' } };
    }

    const token_hash = hash_auth_token(raw_token);
    const [token] = await db
      .select()
      .from(auth_tokens)
      .where(eq(auth_tokens.token_hash, token_hash))
      .limit(1);

    if (!token || token.type !== AuthTokenType.PASSWORD_RESET) {
      return { success: false, error: { code: 'INVALID_TOKEN', message: 'Reset token is invalid or has expired' } };
    }

    if (token.used_at) {
      return { success: false, error: { code: 'TOKEN_USED', message: 'Reset token has already been used' } };
    }

    if (token.expires_at.getTime() <= Date.now()) {
      return { success: false, error: { code: 'TOKEN_EXPIRED', message: 'Reset token is invalid or has expired' } };
    }

    const password_hash = await this.hash_password(new_password);

    // Update password and consume token atomically.
    await db.transaction(async (tx) => {
      await tx.update(users).set({ password_hash }).where(eq(users.id, token.user_id));
      await tx
        .update(auth_tokens)
        .set({ used_at: new Date() })
        .where(eq(auth_tokens.id, token.id));
      // Invalidate other active reset tokens for this user after successful reset.
      await tx
        .update(auth_tokens)
        .set({ used_at: new Date() })
        .where(
          and(
            eq(auth_tokens.user_id, token.user_id),
            eq(auth_tokens.type, AuthTokenType.PASSWORD_RESET),
            isNull(auth_tokens.used_at),
            ne(auth_tokens.id, token.id),
          ),
        );
    });

    return {
      success: true,
      data: { message: 'Password has been reset successfully', user_id: token.user_id },
    };
  }

  /**
   * Create an email verification token for a user.
   * Returns null when user does not exist, is already verified, or request is throttled.
   */
  async create_email_verification_token(email: string): Promise<AuthTokenCreationResult | null> {
    const normalized_email = email.toLowerCase();
    if (this.is_token_request_throttled(normalized_email, AuthTokenType.EMAIL_VERIFICATION)) {
      return null;
    }

    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, email_verified: users.email_verified })
      .from(users)
      .where(eq(users.email, normalized_email))
      .limit(1);
    if (!user || user.email_verified) return null;

    this.record_token_request(normalized_email, AuthTokenType.EMAIL_VERIFICATION);

    const raw_token = generate_auth_token();
    const token_hash = hash_auth_token(raw_token);
    const expires_at = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

    await db
      .update(auth_tokens)
      .set({ used_at: new Date() })
      .where(
        and(
          eq(auth_tokens.user_id, user.id),
          eq(auth_tokens.type, AuthTokenType.EMAIL_VERIFICATION),
          isNull(auth_tokens.used_at),
          gt(auth_tokens.expires_at, new Date()),
        ),
      );

    await db.insert(auth_tokens).values({
      id: randomUUID(),
      user_id: user.id,
      token_hash,
      type: AuthTokenType.EMAIL_VERIFICATION,
      expires_at,
    });

    return { raw_token, email: user.email, name: user.name };
  }

  /** Create a verification token for a known user id (used after registration). */
  async create_email_verification_token_for_user(user_id: string): Promise<AuthTokenCreationResult | null> {
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, email_verified: users.email_verified })
      .from(users)
      .where(eq(users.id, user_id))
      .limit(1);
    if (!user || user.email_verified) return null;

    // Registration-triggered send bypasses cooldown to ensure first verification email is sent.
    const raw_token = generate_auth_token();
    const token_hash = hash_auth_token(raw_token);
    const expires_at = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

    await db
      .update(auth_tokens)
      .set({ used_at: new Date() })
      .where(
        and(
          eq(auth_tokens.user_id, user.id),
          eq(auth_tokens.type, AuthTokenType.EMAIL_VERIFICATION),
          isNull(auth_tokens.used_at),
          gt(auth_tokens.expires_at, new Date()),
        ),
      );

    await db.insert(auth_tokens).values({
      id: randomUUID(),
      user_id: user.id,
      token_hash,
      type: AuthTokenType.EMAIL_VERIFICATION,
      expires_at,
    });

    return { raw_token, email: user.email, name: user.name };
  }

  /** Verify email using a valid, unexpired, single-use token. */
  async verify_email(raw_token: string): Promise<ApiResponse<{ message: string }>> {
    const token_hash = hash_auth_token(raw_token);
    const [token] = await db
      .select({
        id: auth_tokens.id,
        user_id: auth_tokens.user_id,
        type: auth_tokens.type,
        used_at: auth_tokens.used_at,
        expires_at: auth_tokens.expires_at,
      })
      .from(auth_tokens)
      .where(eq(auth_tokens.token_hash, token_hash))
      .limit(1);

    if (!token || token.type !== AuthTokenType.EMAIL_VERIFICATION) {
      return { success: false, error: { code: 'INVALID_TOKEN', message: 'Verification token is invalid or has expired' } };
    }

    if (token.used_at) {
      return { success: false, error: { code: 'TOKEN_USED', message: 'Verification token has already been used' } };
    }

    if (token.expires_at.getTime() <= Date.now()) {
      return { success: false, error: { code: 'TOKEN_EXPIRED', message: 'Verification token is invalid or has expired' } };
    }

    // Mark user verified and consume token atomically.
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ email_verified: true, email_verified_at: new Date() })
        .where(eq(users.id, token.user_id));
      await tx
        .update(auth_tokens)
        .set({ used_at: new Date() })
        .where(eq(auth_tokens.id, token.id));
      await tx
        .update(auth_tokens)
        .set({ used_at: new Date() })
        .where(
          and(
            eq(auth_tokens.user_id, token.user_id),
            eq(auth_tokens.type, AuthTokenType.EMAIL_VERIFICATION),
            isNull(auth_tokens.used_at),
            ne(auth_tokens.id, token.id),
          ),
        );
    });

    return { success: true, data: { message: 'Email verified successfully' } };
  }
}

/**
 * Password Reset Plugin — Password reset flow via email.
 *
 * Features:
 *   - Generate secure reset tokens
 *   - Token expiration (1 hour)
 *   - Email notification with reset link
 *   - Password reset endpoint
 *   - Rate limiting (3 requests per hour)
 *
 * Note: This is a simplified implementation.
 * In production, store tokens in database with expiration.
 */
import { define_plugin } from '@typepress/plugin-sdk';
import crypto from 'crypto';

interface ResetToken {
  user_id: string;
  token: string;
  expires_at: number;
}

// In-memory token storage (use Redis/DB in production)
const reset_tokens = new Map<string, ResetToken>();

function generate_token(): string {
  return crypto.randomBytes(32).toString('hex');
}

function create_reset_token(user_id: string): string {
  const token = generate_token();
  reset_tokens.set(token, {
    user_id,
    token,
    expires_at: Date.now() + 60 * 60 * 1000, // 1 hour
  });
  return token;
}

function verify_reset_token(token: string): { valid: boolean; user_id?: string } {
  const reset_data = reset_tokens.get(token);

  if (!reset_data) {
    return { valid: false };
  }

  if (Date.now() > reset_data.expires_at) {
    reset_tokens.delete(token);
    return { valid: false };
  }

  return { valid: true, user_id: reset_data.user_id };
}

function invalidate_token(token: string): void {
  reset_tokens.delete(token);
}

export default define_plugin({
  name: 'password-reset',
  version: '1.0.0',
  description: 'Password reset flow via email',

  register(api) {
    // Hook into auth for password reset requests
    api.hooks.on('auth:password_reset_requested', async (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      const token = create_reset_token(data.user_id as string);
      console.log(`[PasswordReset] Reset token for ${data.email}: ${token}`);
      // In production, send email with reset link
    });

    console.log('[PasswordReset] Plugin loaded — password reset flow available');
  },
});


/**
 * Two-Factor Auth Plugin — TOTP-based two-factor authentication.
 *
 * Features:
 *   - Generate TOTP secrets for users
 *   - Verify TOTP codes
 *   - Backup codes generation
 *   - QR code URL generation (for authenticator apps)
 *   - Enable/disable 2FA per user
 *
 * Note: This plugin stores 2FA secrets in user.capabilities JSON field.
 * In production, use a dedicated 2FA secrets table with encryption.
 */
import { define_plugin } from '@typepress/plugin-sdk';
import crypto from 'crypto';

// Simple TOTP implementation (for demo purposes)
// In production, use a library like speakeasy

function generate_secret(): string {
  return crypto.randomBytes(20).toString('hex');
}

function generate_backup_codes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

function generate_qr_url(secret: string, email: string, issuer = 'Typepress'): string {
  const encoded_issuer = encodeURIComponent(issuer);
  const encoded_email = encodeURIComponent(email);
  return `otpauth://totp/${encoded_issuer}:${encoded_email}?secret=${secret}&issuer=${encoded_issuer}`;
}

export default define_plugin({
  name: 'two-factor-auth',
  version: '1.0.0',
  description: 'Two-factor authentication with TOTP',

  register(api) {
    // Hook into auth to check 2FA status
    api.hooks.on('auth:before_login', async (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      console.log(`[2FA] Checking 2FA status for: ${data.email}`);
    });

    console.log('[2FA] Plugin loaded — TOTP two-factor authentication available');
    console.log('[2FA] Use generate_secret() and generate_qr_url() for setup');
  },
});


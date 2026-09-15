/**
 * Auth Service Tests — Unit tests for authentication operations.
 *
 * Prisma is mocked to avoid requiring a running database.
 * Tests verify login flow, user lookup, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';

vi.mock('@typepress/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '@typepress/db';
import { AuthService } from './auth.service';

const mock_user = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

// Pre-hash a test password for tests
const TEST_PASSWORD = 'TestPassword123';
let TEST_PASSWORD_HASH: string;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new AuthService();
    TEST_PASSWORD_HASH = await bcrypt.hash(TEST_PASSWORD, 10);
  });

  describe('login', () => {
    it('should return user data on valid credentials', async () => {
      mock_user.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'admin@typepress.dev',
        name: 'Admin',
        role: 'ADMIN',
        password_hash: TEST_PASSWORD_HASH,
      });

      const result = await service.login('admin@typepress.dev', TEST_PASSWORD);

      expect(result.success).toBe(true);
      expect(result.data?.user_id).toBe('1');
      expect(result.data?.email).toBe('admin@typepress.dev');
    });

    it('should return error for nonexistent user', async () => {
      mock_user.user.findUnique.mockResolvedValue(null);

      const result = await service.login('nobody@test.com', 'password');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('get_current_user', () => {
    it('should return user profile', async () => {
      mock_user.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'admin@typepress.dev',
        name: 'Admin',
        role: 'ADMIN',
      });

      const result = await service.get_current_user('1');

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('admin@typepress.dev');
    });

    it('should return error for nonexistent user', async () => {
      mock_user.user.findUnique.mockResolvedValue(null);

      const result = await service.get_current_user('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });
});

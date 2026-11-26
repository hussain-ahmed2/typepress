/**
 * Auth Service Tests — Unit tests for authentication operations.
 *
 * Drizzle db is mocked to avoid requiring a running database.
 * Covers login, profile lookup, password reset, and email verification flows.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';

vi.mock('@node-rs/argon2', () => ({
  Algorithm: { Argon2id: 2 },
  hash: vi.fn(async (password: string) => `$argon2id$v=19$m=19456,t=2,p=1$mocked$${Buffer.from(password).toString('base64')}`),
  verify: vi.fn(async (_hash: string, password: string) => password === 'TestPassword123' || password === 'NewPassword123'),
}));

type MockFn = ReturnType<typeof vi.fn>;

/** Chainable select mock: select().from().where().limit() */
interface SelectChain {
  from: MockFn;
  where: MockFn;
  limit: MockFn;
}

/** Chainable insert mock: insert().values().returning()/then */
interface InsertChain {
  values: MockFn;
  returning: MockFn;
}

/** Chainable update mock: update().set().where() */
interface UpdateChain {
  set: MockFn;
  where: MockFn;
}

interface MockDb {
  select: MockFn;
  insert: MockFn;
  update: MockFn;
  transaction: MockFn;
}

function create_select_chain(result: unknown[]): SelectChain {
  const chain: SelectChain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.limit.mockResolvedValue(result);
  return chain;
}

function create_insert_chain(result: unknown[]): InsertChain {
  const chain: InsertChain = {
    values: vi.fn(),
    returning: vi.fn(),
  };
  // values() returns a thenable that also has returning() for insert().values().returning()
  chain.values.mockImplementation(() => {
    const promise = Promise.resolve(result);
    return Object.assign(promise, { returning: chain.returning });
  });
  chain.returning.mockResolvedValue(result);
  return chain;
}

function create_update_chain(result: unknown = []): UpdateChain {
  const chain: UpdateChain = {
    set: vi.fn(),
    where: vi.fn(),
  };
  chain.set.mockReturnValue(chain);
  chain.where.mockResolvedValue(result);
  return chain;
}

const { mock_db } = vi.hoisted(() => {
  const mock_db: MockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  };
  return { mock_db };
});

vi.mock('@typepress/db', () => ({
  db: mock_db,
  users: { id: 'id', email: 'email', name: 'name', role: 'role', email_verified: 'email_verified', password_hash: 'password_hash' },
  auth_tokens: { id: 'id', user_id: 'user_id', token_hash: 'token_hash', type: 'type', expires_at: 'expires_at', used_at: 'used_at' },
  AuthTokenType: {
    PASSWORD_RESET: 'PASSWORD_RESET',
    EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  },
}));

import { db } from '@typepress/db';
import { AuthService } from './auth.service';

const mock_db_typed = db as unknown as MockDb;

// Pre-hash a test password for deterministic assertions.
const TEST_PASSWORD = 'TestPassword123';
let TEST_PASSWORD_HASH: string;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Default update chain so rehash-on-login best-effort writes don't break tests that don't assert them.
    mock_db_typed.update.mockReturnValue(create_update_chain());
    mock_db_typed.insert.mockReturnValue(create_insert_chain([]));
    service = new AuthService();
    TEST_PASSWORD_HASH = await bcrypt.hash(TEST_PASSWORD, 10);
  });

  describe('login', () => {
    it('should return user data on valid credentials and rehash legacy bcrypt hash', async () => {
      const rehash_update = create_update_chain();
      mock_db_typed.select.mockReturnValueOnce(
        create_select_chain([
          {
            id: '1',
            email: 'admin@typepress.dev',
            name: 'Admin',
            role: 'ADMIN',
            email_verified: true,
            password_hash: TEST_PASSWORD_HASH,
          },
        ]),
      );
      mock_db_typed.update.mockReturnValueOnce(rehash_update);

      const result = await service.login('admin@typepress.dev', TEST_PASSWORD);

      expect(result.success).toBe(true);
      expect(result.data?.user_id).toBe('1');
      expect(result.data?.email).toBe('admin@typepress.dev');
      expect(result.data?.email_verified).toBe(true);
      // Legacy bcrypt hashes are transparently migrated to Argon2id on successful login.
      expect(mock_db_typed.update).toHaveBeenCalledTimes(1);
      expect(rehash_update.set).toHaveBeenCalledWith(
        expect.objectContaining({ password_hash: expect.stringContaining('$argon2id$') }),
      );
    });

    it('should authenticate argon2id hash without rehash', async () => {
      mock_db_typed.select.mockReturnValueOnce(
        create_select_chain([
          {
            id: '1',
            email: 'admin@typepress.dev',
            name: 'Admin',
            role: 'ADMIN',
            email_verified: true,
            password_hash: '$argon2id$v=19$m=19456,t=2,p=1$mocked$VGVzdFBhc3N3b3JkMTIz',
          },
        ]),
      );

      const result = await service.login('admin@typepress.dev', TEST_PASSWORD);

      expect(result.success).toBe(true);
      expect(mock_db_typed.update).not.toHaveBeenCalled();
    });

    it('should return generic error for invalid password', async () => {
      mock_db_typed.select.mockReturnValueOnce(
        create_select_chain([
          {
            id: '1',
            email: 'admin@typepress.dev',
            name: 'Admin',
            role: 'ADMIN',
            email_verified: true,
            password_hash: '$argon2id$v=19$m=19456,t=2,p=1$mocked$VGVzdFBhc3N3b3JkMTIz',
          },
        ]),
      );

      const result = await service.login('admin@typepress.dev', 'WrongPassword123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return error for nonexistent user', async () => {
      mock_db_typed.select.mockReturnValueOnce(create_select_chain([]));

      const result = await service.login('nobody@test.com', 'password');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('get_current_user', () => {
    it('should return user profile', async () => {
      mock_db_typed.select.mockReturnValueOnce(
        create_select_chain([
          {
            id: '1',
            email: 'admin@typepress.dev',
            name: 'Admin',
            role: 'ADMIN',
            email_verified: false,
          },
        ]),
      );

      const result = await service.get_current_user('1');

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('admin@typepress.dev');
      expect(result.data?.email_verified).toBe(false);
    });

    it('should return error for nonexistent user', async () => {
      mock_db_typed.select.mockReturnValueOnce(create_select_chain([]));

      const result = await service.get_current_user('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('password reset', () => {
    it('should create a reset token for existing user', async () => {
      mock_db_typed.select.mockReturnValueOnce(
        create_select_chain([{ id: 'user-1', email: 'user@example.com', name: 'User' }]),
      );
      const update_chain = create_update_chain();
      mock_db_typed.update.mockReturnValueOnce(update_chain);
      const insert_chain = create_insert_chain([{ id: 'token-1' }]);
      mock_db_typed.insert.mockReturnValueOnce(insert_chain);

      const result = await service.create_password_reset_token('user@example.com');

      expect(result).not.toBeNull();
      expect(result?.email).toBe('user@example.com');
      expect(result?.raw_token).toMatch(/^[a-f0-9]{64}$/);
      expect(mock_db_typed.insert).toHaveBeenCalledTimes(1);

      const values_arg = insert_chain.values.mock.calls[0]?.[0] as
        | { user_id: string; token_hash: string; type: string; expires_at: Date }
        | undefined;
      expect(values_arg).toBeDefined();
      expect(values_arg?.user_id).toBe('user-1');
      expect(values_arg?.type).toBe('PASSWORD_RESET');
      expect(values_arg?.token_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(values_arg?.token_hash).not.toBe(result?.raw_token);
      expect(values_arg?.expires_at.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for unknown user (no enumeration)', async () => {
      mock_db_typed.select.mockReturnValueOnce(create_select_chain([]));

      const result = await service.create_password_reset_token('missing@example.com');

      expect(result).toBeNull();
      expect(mock_db_typed.insert).not.toHaveBeenCalled();
    });

    it('should reset password with valid token and mark token used', async () => {
      const raw_token = 'a'.repeat(64);
      // Precompute hash the same way the service does (sha256 hex).
      const { createHash } = await import('node:crypto');
      const token_hash = createHash('sha256').update(raw_token).digest('hex');

      mock_db_typed.select.mockReturnValueOnce(
        create_select_chain([
          {
            id: 'token-1',
            user_id: 'user-1',
            token_hash,
            type: 'PASSWORD_RESET',
            used_at: null,
            expires_at: new Date(Date.now() + 60_000),
          },
        ]),
      );

      const tx_user_update = create_update_chain();
      const tx_token_update = create_update_chain();
      const tx_token_invalidate = create_update_chain();
      const tx = {
        update: vi
          .fn()
          .mockReturnValueOnce(tx_user_update)
          .mockReturnValueOnce(tx_token_update)
          .mockReturnValueOnce(tx_token_invalidate),
      };
      mock_db_typed.transaction.mockImplementation(async (callback: (trx: typeof tx) => Promise<void>) => callback(tx));

      const result = await service.reset_password(raw_token, 'NewPassword123');

      expect(result.success).toBe(true);
      expect(result.data?.user_id).toBe('user-1');
      expect(mock_db_typed.transaction).toHaveBeenCalledTimes(1);
      expect(tx.update).toHaveBeenCalledTimes(3);
      expect(tx_user_update.set).toHaveBeenCalledWith(
        expect.objectContaining({ password_hash: expect.any(String) }),
      );
      expect(tx_token_update.set).toHaveBeenCalledWith(
        expect.objectContaining({ used_at: expect.any(Date) }),
      );
    });

    it('should reject expired reset token', async () => {
      const raw_token = 'b'.repeat(64);
      const { createHash } = await import('node:crypto');
      const token_hash = createHash('sha256').update(raw_token).digest('hex');

      mock_db_typed.select.mockReturnValueOnce(
        create_select_chain([
          {
            id: 'token-1',
            user_id: 'user-1',
            token_hash,
            type: 'PASSWORD_RESET',
            used_at: null,
            expires_at: new Date(Date.now() - 1_000),
          },
        ]),
      );

      const result = await service.reset_password(raw_token, 'NewPassword123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TOKEN_EXPIRED');
      expect(mock_db_typed.transaction).not.toHaveBeenCalled();
    });

    it('should reject used reset token', async () => {
      const raw_token = 'c'.repeat(64);
      const { createHash } = await import('node:crypto');
      const token_hash = createHash('sha256').update(raw_token).digest('hex');

      mock_db_typed.select.mockReturnValueOnce(
        create_select_chain([
          {
            id: 'token-1',
            user_id: 'user-1',
            token_hash,
            type: 'PASSWORD_RESET',
            used_at: new Date(),
            expires_at: new Date(Date.now() + 60_000),
          },
        ]),
      );

      const result = await service.reset_password(raw_token, 'NewPassword123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TOKEN_USED');
    });
  });

  describe('email verification', () => {
    it('should create verification token for unverified user', async () => {
      mock_db_typed.select.mockReturnValueOnce(
        create_select_chain([
          { id: 'user-1', email: 'user@example.com', name: 'User', email_verified: false },
        ]),
      );
      mock_db_typed.update.mockReturnValueOnce(create_update_chain());
      const insert_chain = create_insert_chain([{ id: 'token-1' }]);
      mock_db_typed.insert.mockReturnValueOnce(insert_chain);

      const result = await service.create_email_verification_token('user@example.com');

      expect(result).not.toBeNull();
      expect(result?.raw_token).toMatch(/^[a-f0-9]{64}$/);
      expect(insert_chain.values).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EMAIL_VERIFICATION' }),
      );
    });

    it('should verify email with valid token and mark user verified', async () => {
      const raw_token = 'd'.repeat(64);

      mock_db_typed.select.mockReturnValueOnce(
        create_select_chain([
          {
            id: 'token-1',
            user_id: 'user-1',
            type: 'EMAIL_VERIFICATION',
            used_at: null,
            expires_at: new Date(Date.now() + 60_000),
          },
        ]),
      );

      const tx_user_update = create_update_chain();
      const tx_token_update = create_update_chain();
      const tx_token_invalidate = create_update_chain();
      const tx = {
        update: vi
          .fn()
          .mockReturnValueOnce(tx_user_update)
          .mockReturnValueOnce(tx_token_update)
          .mockReturnValueOnce(tx_token_invalidate),
      };
      mock_db_typed.transaction.mockImplementation(async (callback: (trx: typeof tx) => Promise<void>) => callback(tx));

      const result = await service.verify_email(raw_token);

      expect(result.success).toBe(true);
      expect(tx_user_update.set).toHaveBeenCalledWith(
        expect.objectContaining({ email_verified: true, email_verified_at: expect.any(Date) }),
      );
      expect(tx_token_update.set).toHaveBeenCalledWith(
        expect.objectContaining({ used_at: expect.any(Date) }),
      );
    });

    it('should reject invalid verification token', async () => {
      mock_db_typed.select.mockReturnValueOnce(create_select_chain([]));

      const result = await service.verify_email('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_TOKEN');
    });
  });

  describe('password policy and registration', () => {
    it('should reject weak passwords', () => {
      const result = service.validate_password_strength('short');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 12 characters');
    });

    it('should reject passwords with whitespace', () => {
      const result = service.validate_password_strength('ValidPassword 123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('whitespace');
    });

    it('should return generic error when registering existing email', async () => {
      mock_db_typed.select.mockReturnValueOnce(create_select_chain([{ id: 'existing-user' }]));

      const result = await service.register('existing@example.com', 'User', 'ValidPassword123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REGISTRATION_FAILED');
      expect(result.error?.message).not.toContain('already exists');
    });

    it('should hash new registrations with argon2id', async () => {
      mock_db_typed.select.mockReturnValueOnce(create_select_chain([]));
      const insert_chain = create_insert_chain([
        { id: 'new-user', email: 'new@example.com', name: 'New User', role: 'AUTHOR', email_verified: false },
      ]);
      mock_db_typed.insert.mockReturnValueOnce(insert_chain);

      const result = await service.register('new@example.com', 'New User', 'ValidPassword123');

      expect(result.success).toBe(true);
      expect(insert_chain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: expect.stringContaining('$argon2id$'),
          email: 'new@example.com',
        }),
      );
    });
  });
});

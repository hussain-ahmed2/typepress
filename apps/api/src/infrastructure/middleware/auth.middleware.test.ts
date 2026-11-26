/**
 * Auth Middleware Tests — session bridge and auth guard behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';

type MockFn = ReturnType<typeof vi.fn>;

interface SelectChain {
  from: MockFn;
  where: MockFn;
  limit: MockFn;
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

const { mock_db } = vi.hoisted(() => ({
  mock_db: {
    select: vi.fn(),
  },
}));

vi.mock('@typepress/db', () => ({
  db: mock_db,
  users: { id: 'id', capabilities: 'capabilities' },
}));

vi.mock('@typepress/core', () => ({
  CapabilityChecker: class {
    private readonly capabilities: string[];
    constructor(capabilities: string[]) {
      this.capabilities = capabilities;
    }
    has(capability: string): boolean {
      return this.capabilities.includes(capability);
    }
  },
}));

import { db } from '@typepress/db';
import { attach_session_user, require_auth, require_capability } from './auth.middleware';

type MockReply = FastifyReply & {
  status_code: number;
  payload: unknown;
};

function create_request(overrides: Partial<FastifyRequest> = {}): FastifyRequest {
  return {
    session: {},
    ...overrides,
  } as unknown as FastifyRequest;
}

function create_reply(): MockReply {
  const reply = {
    status_code: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.status_code = code;
      return this;
    },
    send(payload: unknown) {
      this.payload = payload;
      return this;
    },
  };

  return reply as unknown as MockReply;
}

const mock_db_typed = db as unknown as {
  select: ReturnType<typeof vi.fn>;
};

describe('attach_session_user', () => {
  it('populates request.user_id from session user_id', async () => {
    const request = create_request({ session: { user_id: 'user-1' } as FastifyRequest['session'] });

    await attach_session_user(request);

    expect(request.user_id).toBe('user-1');
  });

  it('does not set request.user_id when session has no user_id', async () => {
    const request = create_request({ session: {} as FastifyRequest['session'] });

    await attach_session_user(request);

    expect(request.user_id).toBeUndefined();
  });

  it('ignores empty session user_id', async () => {
    const request = create_request({ session: { user_id: '' } as FastifyRequest['session'] });

    await attach_session_user(request);

    expect(request.user_id).toBeUndefined();
  });
});

describe('require_auth', () => {
  it('returns 401 when request.user_id is missing', async () => {
    const request = create_request();
    const reply = create_reply();

    await require_auth(request, reply);

    expect(reply.status_code).toBe(401);
    expect(reply.payload).toEqual({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  });

  it('allows request when request.user_id is present', async () => {
    const request = create_request({ user_id: 'user-1' } as Partial<FastifyRequest>);
    const reply = create_reply();

    await require_auth(request, reply);

    expect(reply.status_code).toBe(200);
    expect(reply.payload).toBeUndefined();
  });
});

describe('require_capability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when request.user_id is missing', async () => {
    const request = create_request();
    const reply = create_reply();

    await require_capability('content:create')(request, reply);

    expect(reply.status_code).toBe(401);
  });

  it('returns 403 when user lacks capability', async () => {
    mock_db_typed.select.mockReturnValueOnce(create_select_chain([{ capabilities: ['content:read'] }]));
    const request = create_request({ user_id: 'user-1' } as Partial<FastifyRequest>);
    const reply = create_reply();

    await require_capability('content:create')(request, reply);

    expect(reply.status_code).toBe(403);
    expect(reply.payload).toEqual({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Missing required capability: content:create' },
    });
  });

  it('allows request when user has capability', async () => {
    const select_chain = create_select_chain([{ capabilities: ['content:create'] }]);
    mock_db_typed.select.mockReturnValueOnce(select_chain);
    const request = create_request({ user_id: 'user-1' } as Partial<FastifyRequest>);
    const reply = create_reply();

    await require_capability('content:create')(request, reply);

    expect(reply.status_code).toBe(200);
    expect(reply.payload).toBeUndefined();
    // Verify user capabilities were queried via Drizzle select chain.
    expect(mock_db_typed.select).toHaveBeenCalledTimes(1);
    expect(select_chain.from).toHaveBeenCalledTimes(1);
    expect(select_chain.where).toHaveBeenCalledTimes(1);
    expect(select_chain.limit).toHaveBeenCalledWith(1);
  });
});

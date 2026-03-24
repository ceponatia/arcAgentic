import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestApp, getRequest } from '../../../../config/vitest/hono/create-test-client.js';

const dbModule = vi.hoisted(() => ({
  getOrCreateDefaultUser: vi.fn().mockResolvedValue(undefined),
  verifyLocalUserPassword: vi.fn(),
}));

const tokenModule = vi.hoisted(() => ({
  getAuthSecret: vi.fn().mockReturnValue('test-secret'),
  signAuthToken: vi.fn().mockReturnValue('signed.jwt.token'),
  verifyAuthToken: vi.fn(),
}));

const loggerModule = vi.hoisted(() => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  },
}));

vi.mock('@arcagentic/db/node', () => ({
  getOrCreateDefaultUser: dbModule.getOrCreateDefaultUser,
  verifyLocalUserPassword: dbModule.verifyLocalUserPassword,
}));

vi.mock('@arcagentic/logger', () => ({
  createLogger: vi.fn(() => loggerModule.logger),
}));

vi.mock('../../src/auth/token.js', () => ({
  getAuthSecret: tokenModule.getAuthSecret,
  signAuthToken: tokenModule.signAuthToken,
  verifyAuthToken: tokenModule.verifyAuthToken,
}));

import { attachAuthUser } from '../../src/auth/middleware.js';
import { registerAuthRoutes } from '../../src/routes/system/auth.js';

const ORIGINAL_ENV = {
  INVITE_EMAILS: process.env['INVITE_EMAILS'],
  INVITE_ONLY: process.env['INVITE_ONLY'],
};

function restoreEnv(): void {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}

function createApp() {
  const app = createTestApp();
  app.use('*', attachAuthUser);
  registerAuthRoutes(app);
  return app;
}

function postJson(path: string, body: unknown, ip: string): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

describe('auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreEnv();

    dbModule.getOrCreateDefaultUser.mockResolvedValue(undefined);
    dbModule.verifyLocalUserPassword.mockResolvedValue({ ok: false });
    tokenModule.getAuthSecret.mockReturnValue('test-secret');
    tokenModule.signAuthToken.mockReturnValue('signed.jwt.token');
    tokenModule.verifyAuthToken.mockReturnValue({ ok: false, error: 'invalid' });
  });

  afterEach(() => {
    restoreEnv();
  });

  it('logs in with valid credentials and returns a token', async () => {
    dbModule.verifyLocalUserPassword.mockResolvedValue({
      ok: true,
      user: {
        identifier: 'admin@example.com',
        role: 'admin',
      },
    });

    const response = await createApp().request(
      postJson(
        '/auth/login',
        {
          identifier: 'admin@example.com',
          password: 'correct-horse-battery-staple',
        },
        '198.51.100.10'
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      token: 'signed.jwt.token',
      user: {
        identifier: 'admin@example.com',
        role: 'admin',
      },
    });
    expect(dbModule.getOrCreateDefaultUser).toHaveBeenCalledTimes(1);
    expect(dbModule.verifyLocalUserPassword).toHaveBeenCalledWith({
      identifier: 'admin@example.com',
      password: 'correct-horse-battery-staple',
    });
    expect(tokenModule.signAuthToken).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'admin@example.com',
        role: 'admin',
        iat: expect.any(Number),
        exp: expect.any(Number),
      }),
      'test-secret'
    );
  });

  it('rejects invalid credentials', async () => {
    dbModule.verifyLocalUserPassword.mockResolvedValue({ ok: false });

    const response = await createApp().request(
      postJson(
        '/auth/login',
        {
          identifier: 'admin@example.com',
          password: 'wrong-password',
        },
        '198.51.100.11'
      )
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'invalid credentials' });
  });

  it('returns the authenticated user from /auth/me when a token is present', async () => {
    tokenModule.verifyAuthToken.mockReturnValue({
      ok: true,
      payload: {
        sub: 'user@example.com',
        role: 'user',
        iat: 1,
        exp: 999_999,
      },
    });

    const response = await createApp().request(getRequest('/auth/me', { authToken: 'good-token' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      user: {
        identifier: 'user@example.com',
        role: 'user',
        email: null,
      },
    });
  });

  it('returns a null user from /auth/me when no token is present', async () => {
    const response = await createApp().request(getRequest('/auth/me'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, user: null });
  });

  it('rate limits repeated login attempts from the same IP', async () => {
    const app = createApp();
    const ip = '203.0.113.25';

    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        app.request(
          postJson(
            '/auth/login',
            {
              identifier: 'admin@example.com',
              password: 'wrong-password',
            },
            ip
          )
        )
      )
    );

    expect(responses.slice(0, 5).map((response) => response.status)).toEqual([401, 401, 401, 401, 401]);
    expect(responses[5]?.status).toBe(429);
    await expect(responses[5]?.json()).resolves.toEqual({
      error: 'Too many requests',
      retryAfter: expect.any(Number),
    });
    expect(dbModule.getOrCreateDefaultUser).toHaveBeenCalledTimes(5);
  });
});

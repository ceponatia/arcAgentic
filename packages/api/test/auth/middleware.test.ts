import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createTestApp,
  getRequest,
} from '../../../../config/vitest/hono/create-test-client.js';

const tokenModule = vi.hoisted(() => ({
  getAuthSecret: vi.fn(),
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

vi.mock('@arcagentic/logger', () => ({
  createLogger: vi.fn(() => loggerModule.logger),
}));

vi.mock('../../src/auth/token.js', () => ({
  getAuthSecret: tokenModule.getAuthSecret,
  verifyAuthToken: tokenModule.verifyAuthToken,
}));

import {
  attachAuthUser,
  getAuthUser,
  requireAdmin,
  requireAuthIfEnabled,
} from '../../src/auth/middleware.js';

const ORIGINAL_ENV = {
  AUTH_REQUIRED: process.env['AUTH_REQUIRED'],
  BYPASS_AUTH: process.env['BYPASS_AUTH'],
  DEBUG_AUTH: process.env['DEBUG_AUTH'],
  NODE_ENV: process.env['NODE_ENV'],
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
  app.get('/inspect', (c) => c.json({ user: getAuthUser(c) }, 200));

  app.use('/private/*', requireAuthIfEnabled);
  app.get('/private/data', (c) => c.json({ ok: true, user: getAuthUser(c) }, 200));

  app.use('/admin/*', requireAdmin);
  app.get('/admin/panel', (c) => c.json({ ok: true, user: getAuthUser(c) }, 200));

  return app;
}

describe('auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreEnv();

    delete process.env['AUTH_REQUIRED'];
    delete process.env['BYPASS_AUTH'];
    delete process.env['DEBUG_AUTH'];
    delete process.env['NODE_ENV'];

    tokenModule.getAuthSecret.mockReturnValue('test-secret');
    tokenModule.verifyAuthToken.mockReturnValue({ ok: false, error: 'invalid' });
  });

  afterEach(() => {
    restoreEnv();
  });

  it('sets auth context when a bearer token verifies successfully', async () => {
    tokenModule.verifyAuthToken.mockReturnValue({
      ok: true,
      payload: {
        sub: 'admin@example.com',
        role: 'admin',
        iat: 1,
        exp: 2,
      },
    });

    const response = await createApp().request(getRequest('/inspect', { authToken: 'valid-token' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: {
        identifier: 'admin@example.com',
        role: 'admin',
        email: null,
      },
    });
    expect(tokenModule.getAuthSecret).toHaveBeenCalledTimes(1);
    expect(tokenModule.verifyAuthToken).toHaveBeenCalledWith('valid-token', 'test-secret');
  });

  it('returns 401 for protected routes when the token is missing', async () => {
    process.env['AUTH_REQUIRED'] = 'true';

    const response = await createApp().request(getRequest('/private/data'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'Unauthorized' });
  });

  it('returns 401 for protected routes when token verification fails', async () => {
    process.env['AUTH_REQUIRED'] = 'true';
    tokenModule.verifyAuthToken.mockReturnValue({ ok: false, error: 'invalid' });

    const response = await createApp().request(getRequest('/private/data', { authToken: 'bad-token' }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'Unauthorized' });
  });

  it('bypasses auth in development mode when BYPASS_AUTH is enabled', async () => {
    process.env['AUTH_REQUIRED'] = 'true';
    process.env['BYPASS_AUTH'] = 'true';
    process.env['NODE_ENV'] = 'development';

    const response = await createApp().request(getRequest('/private/data'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      user: {
        identifier: 'dev-admin',
        role: 'admin',
        email: 'admin@example.com',
      },
    });
  });

  it('rejects non-admin users in requireAdmin', async () => {
    tokenModule.verifyAuthToken.mockReturnValue({
      ok: true,
      payload: {
        sub: 'player@example.com',
        role: 'user',
        iat: 1,
        exp: 2,
      },
    });

    const response = await createApp().request(getRequest('/admin/panel', { authToken: 'user-token' }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'Forbidden' });
  });

  it('allows admins through requireAdmin', async () => {
    tokenModule.verifyAuthToken.mockReturnValue({
      ok: true,
      payload: {
        sub: 'admin@example.com',
        role: 'admin',
        iat: 1,
        exp: 2,
      },
    });

    const response = await createApp().request(getRequest('/admin/panel', { authToken: 'admin-token' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      user: {
        identifier: 'admin@example.com',
        role: 'admin',
        email: null,
      },
    });
  });
});

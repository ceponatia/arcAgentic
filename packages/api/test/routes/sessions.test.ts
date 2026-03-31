import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createTestApp,
  deleteRequest,
  getRequest,
  postRequest,
} from '../../../../config/vitest/hono/create-test-client.js';

const dbModule = vi.hoisted(() => ({
  listSessions: vi.fn().mockResolvedValue([]),
  getEntityProfile: vi.fn().mockResolvedValue(null),
  createSession: vi.fn(),
  getSession: vi.fn(),
  deleteSession: vi.fn().mockResolvedValue(undefined),
  getPromptTag: vi.fn().mockResolvedValue(null),
  createSessionTagBinding: vi.fn().mockResolvedValue(undefined),
  upsertActorState: vi.fn().mockResolvedValue(undefined),
  getSessionProjection: vi.fn().mockResolvedValue(null),
  getEventsForSession: vi.fn().mockResolvedValue([]),
  listNarratorMessagesBySession: vi.fn().mockResolvedValue([]),
  getActorState: vi.fn().mockResolvedValue(null),
}));

const tokenModule = vi.hoisted(() => ({
  getAuthSecret: vi.fn().mockReturnValue('test-secret'),
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
  listSessions: dbModule.listSessions,
  getEntityProfile: dbModule.getEntityProfile,
  createSession: dbModule.createSession,
  getSession: dbModule.getSession,
  deleteSession: dbModule.deleteSession,
  getPromptTag: dbModule.getPromptTag,
  createSessionTagBinding: dbModule.createSessionTagBinding,
  upsertActorState: dbModule.upsertActorState,
  getSessionProjection: dbModule.getSessionProjection,
  getEventsForSession: dbModule.getEventsForSession,
  listNarratorMessagesBySession: dbModule.listNarratorMessagesBySession,
  getActorState: dbModule.getActorState,
}));

vi.mock('@arcagentic/logger', () => ({
  createLogger: vi.fn(() => loggerModule.logger),
}));

vi.mock('../../src/auth/token.js', () => ({
  getAuthSecret: tokenModule.getAuthSecret,
  verifyAuthToken: tokenModule.verifyAuthToken,
}));

vi.mock('../../src/routes/game/sessions/session-create-full.js', () => ({
  handleCreateFullSession: vi.fn(() => new Response(null, { status: 204 })),
}));

vi.mock('../../src/routes/game/sessions/session-messages.js', () => ({
  handleListMessages: vi.fn(() => new Response(null, { status: 204 })),
  handlePatchMessage: vi.fn(() => new Response(null, { status: 204 })),
  handleDeleteMessage: vi.fn(() => new Response(null, { status: 204 })),
}));

vi.mock('../../src/routes/game/sessions/session-npcs.js', () => ({
  handleListNpcs: vi.fn(() => new Response(null, { status: 204 })),
  handleCreateNpc: vi.fn(() => new Response(null, { status: 204 })),
}));

vi.mock('../../src/routes/game/sessions/session-effective.js', () => ({
  handleGetEffective: vi.fn(() => new Response(null, { status: 204 })),
}));

vi.mock('../../src/routes/game/sessions/session-heartbeat.js', () => ({
  handleSessionHeartbeat: vi.fn(() => new Response(null, { status: 204 })),
}));

vi.mock('../../src/routes/game/sessions/session-disconnect.js', () => ({
  handleSessionDisconnect: vi.fn(() => new Response(null, { status: 204 })),
}));

import { attachAuthUser, requireAuthIfEnabled } from '../../src/auth/middleware.js';
import { registerSessionRoutes } from '../../src/routes/game/sessions/index.js';

const ORIGINAL_ENV = {
  AUTH_REQUIRED: process.env['AUTH_REQUIRED'],
};

const SESSION_ID = '11111111-1111-4111-8111-111111111111';

function restoreEnv(): void {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}

function createLoadedData() {
  return {
    characters: [{ id: 'char-001', name: 'Hero' }],
    settings: [{ id: 'setting-001', name: 'World' }],
  } as never;
}

function createApp() {
  const app = createTestApp();

  app.use('*', attachAuthUser);
  app.use('*', requireAuthIfEnabled);
  registerSessionRoutes(app, { getLoaded: () => createLoadedData() });

  return app;
}

describe('session routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreEnv();

    process.env['AUTH_REQUIRED'] = 'true';

    tokenModule.getAuthSecret.mockReturnValue('test-secret');
    tokenModule.verifyAuthToken.mockReturnValue({
      ok: true,
      payload: {
        sub: 'player@example.com',
        role: 'user',
        iat: 1,
        exp: 999_999,
      },
    });

    dbModule.listSessions.mockResolvedValue([]);
    dbModule.getEntityProfile.mockResolvedValue(null);
    dbModule.createSession.mockReset();
    dbModule.getSession.mockReset();
    dbModule.deleteSession.mockResolvedValue(undefined);
    dbModule.getPromptTag.mockResolvedValue(null);
    dbModule.createSessionTagBinding.mockResolvedValue(undefined);
    dbModule.upsertActorState.mockResolvedValue(undefined);
    dbModule.getSessionProjection.mockResolvedValue(null);
    dbModule.getEventsForSession.mockResolvedValue([]);
    dbModule.listNarratorMessagesBySession.mockResolvedValue([]);
    dbModule.getActorState.mockResolvedValue(null);
  });

  afterEach(() => {
    restoreEnv();
  });

  it('lists sessions for the authenticated owner', async () => {
    dbModule.listSessions.mockResolvedValue([
      {
        id: SESSION_ID,
        name: 'Campaign One',
        playerCharacterId: 'char-001',
        settingId: 'setting-001',
        status: 'active',
        createdAt: new Date('2026-03-20T12:00:00Z'),
        updatedAt: new Date('2026-03-21T12:00:00Z'),
      },
    ]);
    dbModule.getEntityProfile.mockImplementation(async (id: string) => {
      if (id === 'char-001') return { name: 'Hero' };
      if (id === 'setting-001') return { name: 'World' };
      return null;
    });

    const response = await createApp().request(getRequest('/sessions', { authToken: 'valid-token' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        id: SESSION_ID,
        name: 'Campaign One',
        playerCharacterId: 'char-001',
        settingId: 'setting-001',
        characterName: 'Hero',
        settingName: 'World',
        status: 'active',
        createdAt: '2026-03-20T12:00:00.000Z',
        updatedAt: '2026-03-21T12:00:00.000Z',
      },
    ]);
    expect(dbModule.listSessions).toHaveBeenCalledWith('player@example.com');
  });

  it('creates a session from a valid request body', async () => {
    dbModule.createSession.mockResolvedValue({
      id: 'session-created-001',
      playerCharacterId: null,
      settingId: null,
      createdAt: new Date('2026-03-24T12:00:00Z'),
    });

    const response = await createApp().request(
      postRequest(
        '/sessions',
        {
          characterId: 'char-001',
          settingId: 'setting-001',
        },
        { authToken: 'valid-token' }
      )
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: 'session-created-001',
      playerCharacterId: 'char-001',
      settingId: 'setting-001',
      createdAt: '2026-03-24T12:00:00.000Z',
    });
    expect(dbModule.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerEmail: 'player@example.com',
        characterTemplateId: 'char-001',
        settingTemplateId: 'setting-001',
      })
    );
    expect(dbModule.upsertActorState).toHaveBeenCalledTimes(1);
  });

  it('returns a single session by id', async () => {
    dbModule.getSession.mockResolvedValue({
      id: SESSION_ID,
      name: 'Campaign One',
      status: 'active',
      createdAt: new Date('2026-03-20T12:00:00Z'),
      updatedAt: new Date('2026-03-21T12:00:00Z'),
    });
    dbModule.getSessionProjection.mockResolvedValue({
      status: 'active',
      currentTick: 4,
    });
    dbModule.getEventsForSession.mockResolvedValue([]);

    const response = await createApp().request(
      getRequest(`/sessions/${SESSION_ID}`, { authToken: 'valid-token' })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: SESSION_ID,
      name: 'Campaign One',
      status: 'active',
      createdAt: '2026-03-20T12:00:00.000Z',
      updatedAt: '2026-03-21T12:00:00.000Z',
      projection: {
        status: 'active',
        currentTick: 4,
      },
      messages: [],
    });
  });

  it('deletes a session by id', async () => {
    const response = await createApp().request(
      deleteRequest(`/sessions/${SESSION_ID}`, { authToken: 'valid-token' })
    );

    expect(response.status).toBe(204);
    await expect(response.text()).resolves.toBe('');
    expect(dbModule.deleteSession).toHaveBeenCalledWith(SESSION_ID, 'player@example.com');
  });

  it('requires auth for session routes', async () => {
    const response = await createApp().request(getRequest('/sessions'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'Unauthorized' });
  });
});

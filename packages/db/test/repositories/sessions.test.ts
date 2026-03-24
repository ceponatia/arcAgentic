import { DEFAULT_START_TIME } from '@arcagentic/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sessionProjections, sessions } from '../../src/schema/index.js';
import {
  createSession,
  deleteSession,
  getActiveSessions,
  getSession,
  getSessionGameTime,
  getSessionProjection,
  listRecentSessionsByHeartbeat,
  listSessions,
  listStaleSessionsByHeartbeat,
  updateSessionHeartbeat,
  upsertProjection,
} from '../../src/repositories/sessions.js';
import {
  createDeleteChain,
  createSelectChain,
  createUpdateChain,
} from '../support/drizzle-mock.js';

const operators = vi.hoisted(() => ({
  eq: vi.fn((left: unknown, right: unknown) => ({ op: 'eq', left, right })),
  and: vi.fn((...conditions: unknown[]) => ({ op: 'and', conditions })),
  or: vi.fn((...conditions: unknown[]) => ({ op: 'or', conditions })),
  lt: vi.fn((left: unknown, right: unknown) => ({ op: 'lt', left, right })),
  gt: vi.fn((left: unknown, right: unknown) => ({ op: 'gt', left, right })),
  isNull: vi.fn((value: unknown) => ({ op: 'isNull', value })),
  isNotNull: vi.fn((value: unknown) => ({ op: 'isNotNull', value })),
}));

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('drizzle-orm', () => operators);

vi.mock('../../src/connection/index.js', () => ({
  drizzle: mockDb,
  db: mockDb,
}));

describe('sessions repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a session and its initial projection in one transaction', async () => {
    const createdSession = { id: 'session-id-12345678', ownerEmail: 'owner@example.com' };
    const sessionInsertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([createdSession]),
    };
    const projectionInsertChain = {
      values: vi.fn().mockResolvedValue(undefined),
    };
    const tx = {
      insert: vi
        .fn()
        .mockReturnValueOnce(sessionInsertChain)
        .mockReturnValueOnce(projectionInsertChain),
    };

    mockDb.transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) =>
      callback(tx)
    );

    const result = await createSession({
      id: 'session-id-12345678',
      ownerEmail: 'owner@example.com',
      characterTemplateId: 'character-1',
      settingTemplateId: 'setting-1',
    });

    expect(tx.insert).toHaveBeenNthCalledWith(1, sessions);
    expect(sessionInsertChain.values).toHaveBeenCalledWith({
      id: 'session-id-12345678',
      ownerEmail: 'owner@example.com',
      name: 'Session session-',
      playerCharacterId: 'character-1',
      settingId: 'setting-1',
    });
    expect(tx.insert).toHaveBeenNthCalledWith(2, sessionProjections);
    expect(projectionInsertChain.values).toHaveBeenCalledWith({
      sessionId: 'session-id-12345678',
      location: {},
      inventory: {},
      time: {},
      worldState: {},
      lastEventSeq: 0n,
    });
    expect(result).toBe(createdSession);
  });

  it('gets a session by id and owner email', async () => {
    const row = { id: 'session-1' };
    const selectChain = createSelectChain([row], 'limit');
    mockDb.select.mockReturnValue(selectChain);

    const result = await getSession('session-1', 'owner@example.com');

    expect(selectChain.from).toHaveBeenCalledWith(sessions);
    expect(operators.eq).toHaveBeenNthCalledWith(1, sessions.id, 'session-1');
    expect(operators.eq).toHaveBeenNthCalledWith(2, sessions.ownerEmail, 'owner@example.com');
    expect(operators.and).toHaveBeenCalledWith(
      operators.eq.mock.results[0]?.value,
      operators.eq.mock.results[1]?.value
    );
    expect(selectChain.where).toHaveBeenCalledWith(operators.and.mock.results[0]?.value);
    expect(selectChain.limit).toHaveBeenCalledWith(1);
    expect(result).toBe(row);
  });

  it('lists sessions for an owner ordered by creation time', async () => {
    const rows = [{ id: 'session-1' }];
    const selectChain = createSelectChain(rows, 'orderBy');
    mockDb.select.mockReturnValue(selectChain);

    const result = await listSessions('owner@example.com');

    expect(operators.eq).toHaveBeenCalledWith(sessions.ownerEmail, 'owner@example.com');
    expect(selectChain.where).toHaveBeenCalledWith(operators.eq.mock.results[0]?.value);
    expect(selectChain.orderBy).toHaveBeenCalledWith(sessions.createdAt);
    expect(result).toEqual(rows);
  });

  it('lists active sessions by status', async () => {
    const rows = [{ id: 'session-1' }];
    const selectChain = createSelectChain(rows, 'where');
    mockDb.select.mockReturnValue(selectChain);

    const result = await getActiveSessions();

    expect(mockDb.select).toHaveBeenCalledWith({ id: sessions.id });
    expect(operators.eq).toHaveBeenCalledWith(sessions.status, 'active');
    expect(selectChain.where).toHaveBeenCalledWith(operators.eq.mock.results[0]?.value);
    expect(result).toEqual(rows);
  });

  it('deletes a session with both id and owner safeguards', async () => {
    const deleteChain = createDeleteChain(undefined);
    mockDb.delete.mockReturnValue(deleteChain);

    await deleteSession('session-1', 'owner@example.com');

    expect(mockDb.delete).toHaveBeenCalledWith(sessions);
    expect(operators.eq).toHaveBeenNthCalledWith(1, sessions.id, 'session-1');
    expect(operators.eq).toHaveBeenNthCalledWith(2, sessions.ownerEmail, 'owner@example.com');
    expect(operators.and).toHaveBeenCalledWith(
      operators.eq.mock.results[0]?.value,
      operators.eq.mock.results[1]?.value
    );
    expect(deleteChain.where).toHaveBeenCalledWith(operators.and.mock.results[0]?.value);
  });

  it('loads a session projection by session id', async () => {
    const row = { sessionId: 'session-1', time: {} };
    const selectChain = createSelectChain([row], 'limit');
    mockDb.select.mockReturnValue(selectChain);

    const result = await getSessionProjection('session-1');

    expect(selectChain.from).toHaveBeenCalledWith(sessionProjections);
    expect(operators.eq).toHaveBeenCalledWith(sessionProjections.sessionId, 'session-1');
    expect(selectChain.limit).toHaveBeenCalledWith(1);
    expect(result).toBe(row);
  });

  it('returns null game time when no projection exists', async () => {
    const selectChain = createSelectChain([], 'limit');
    mockDb.select.mockReturnValue(selectChain);

    await expect(getSessionGameTime('session-1')).resolves.toBeNull();
  });

  it('parses game time from projection current state', async () => {
    const selectChain = createSelectChain(
      [
        {
          time: {
            current: {
              year: 2,
              month: 3,
              dayOfMonth: 12,
              absoluteDay: 42,
              hour: 9,
              minute: 15,
              second: 0,
            },
          },
        },
      ],
      'limit'
    );
    mockDb.select.mockReturnValue(selectChain);

    await expect(getSessionGameTime('session-1')).resolves.toEqual({
      year: 2,
      month: 3,
      dayOfMonth: 12,
      absoluteDay: 42,
      hour: 9,
      minute: 15,
      second: 0,
    });
  });

  it('falls back to default values when projection time data is partial', async () => {
    const selectChain = createSelectChain(
      [
        {
          time: {
            current: {
              day: 7,
              hour: 18,
            },
          },
        },
      ],
      'limit'
    );
    mockDb.select.mockReturnValue(selectChain);

    await expect(getSessionGameTime('session-1')).resolves.toEqual({
      year: DEFAULT_START_TIME.year,
      month: DEFAULT_START_TIME.month,
      dayOfMonth: 7,
      absoluteDay: 7,
      hour: 18,
      minute: DEFAULT_START_TIME.minute,
      second: DEFAULT_START_TIME.second,
    });
  });

  it('updates the session heartbeat and returns the updated row', async () => {
    const heartbeatAt = new Date('2026-03-24T12:00:00.000Z');
    const updatedRow = { id: 'session-1', lastHeartbeatAt: heartbeatAt };
    const updateChain = createUpdateChain([updatedRow], 'returning');
    mockDb.update.mockReturnValue(updateChain);

    const result = await updateSessionHeartbeat('session-1', heartbeatAt);

    expect(mockDb.update).toHaveBeenCalledWith(sessions);
    expect(updateChain.set).toHaveBeenCalledWith({
      lastHeartbeatAt: heartbeatAt,
      updatedAt: expect.any(Date),
    });
    expect(operators.eq).toHaveBeenCalledWith(sessions.id, 'session-1');
    expect(updateChain.returning).toHaveBeenCalledWith({
      id: sessions.id,
      lastHeartbeatAt: sessions.lastHeartbeatAt,
    });
    expect(result).toEqual(updatedRow);
  });

  it('lists stale sessions by missing or old heartbeat timestamps', async () => {
    const rows = [{ id: 'session-1', lastHeartbeatAt: null }];
    const selectChain = createSelectChain(rows, 'where');
    const cutoff = new Date('2026-03-24T12:00:00.000Z');
    mockDb.select.mockReturnValue(selectChain);

    const result = await listStaleSessionsByHeartbeat(cutoff);

    expect(operators.isNull).toHaveBeenCalledWith(sessions.lastHeartbeatAt);
    expect(operators.lt).toHaveBeenCalledWith(sessions.lastHeartbeatAt, cutoff);
    expect(operators.or).toHaveBeenCalledWith(
      operators.isNull.mock.results[0]?.value,
      operators.lt.mock.results[0]?.value
    );
    expect(selectChain.where).toHaveBeenCalledWith(operators.or.mock.results[0]?.value);
    expect(result).toEqual(rows);
  });

  it('lists recent sessions by non-null heartbeat timestamps after the cutoff', async () => {
    const rows = [{ id: 'session-1', lastHeartbeatAt: new Date('2026-03-24T12:05:00.000Z') }];
    const selectChain = createSelectChain(rows, 'where');
    const cutoff = new Date('2026-03-24T12:00:00.000Z');
    mockDb.select.mockReturnValue(selectChain);

    const result = await listRecentSessionsByHeartbeat(cutoff);

    expect(operators.isNotNull).toHaveBeenCalledWith(sessions.lastHeartbeatAt);
    expect(operators.gt).toHaveBeenCalledWith(sessions.lastHeartbeatAt, cutoff);
    expect(operators.and).toHaveBeenCalledWith(
      operators.isNotNull.mock.results[0]?.value,
      operators.gt.mock.results[0]?.value
    );
    expect(selectChain.where).toHaveBeenCalledWith(operators.and.mock.results[0]?.value);
    expect(result).toEqual(rows);
  });

  it('updates only the provided projection buckets during projection upsert', async () => {
    const updateChain = createUpdateChain(undefined, 'where');
    mockDb.update.mockReturnValue(updateChain);

    await upsertProjection('session-1', {
      worldState: { weather: 'rain' },
      inventory: { apple: 1 },
    });

    expect(mockDb.update).toHaveBeenCalledWith(sessionProjections);
    expect(updateChain.set).toHaveBeenCalledWith({
      worldState: { weather: 'rain' },
      inventory: { apple: 1 },
    });
    expect(operators.eq).toHaveBeenCalledWith(sessionProjections.sessionId, 'session-1');
    expect(updateChain.where).toHaveBeenCalledWith(operators.eq.mock.results[0]?.value);
  });
});

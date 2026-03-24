import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveProjectionState } from '../src/snapshot/store.js';

const dbModule = vi.hoisted(() => ({
  insert: vi.fn(),
  sessionProjections: {
    sessionId: 'sessionProjections.sessionId',
  },
}));

vi.mock('@arcagentic/db', () => ({
  db: {
    insert: dbModule.insert,
  },
  sessionProjections: dbModule.sessionProjections,
}));

describe('saveProjectionState', () => {
  let valuesMock: ReturnType<typeof vi.fn>;
  let onConflictDoUpdateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dbModule.insert.mockReset();

    onConflictDoUpdateMock = vi.fn().mockResolvedValue(undefined);
    valuesMock = vi.fn().mockReturnValue({
      onConflictDoUpdate: onConflictDoUpdateMock,
    });

    dbModule.insert.mockReturnValue({
      values: valuesMock,
    });
  });

  it('saves location projection state into the location column', async () => {
    const state = {
      'loc-001': { id: 'loc-001', actors: ['actor-test-001'], items: ['item-test-001'] },
    };

    await saveProjectionState({
      sessionId: 'session-test-001',
      name: 'location',
      state,
      lastEventSeq: 4n,
    });

    expect(dbModule.insert).toHaveBeenCalledWith(dbModule.sessionProjections);
    expect(valuesMock).toHaveBeenCalledWith({
      sessionId: 'session-test-001',
      lastEventSeq: 4n,
      updatedAt: expect.any(Date),
      location: state,
      inventory: {},
      time: {},
      npcs: {},
    });
  });

  it('saves npc projection state into the npcs column', async () => {
    const state = {
      'actor-test-001': {
        id: 'actor-test-001',
        location: { locationId: 'loc-001' },
        health: { current: 100, max: 100 },
        status: 'alive',
        inventory: [],
      },
    };

    await saveProjectionState({
      sessionId: 'session-test-001',
      name: 'npcs',
      state,
      lastEventSeq: 6n,
    });

    expect(valuesMock).toHaveBeenCalledWith({
      sessionId: 'session-test-001',
      lastEventSeq: 6n,
      updatedAt: expect.any(Date),
      location: {},
      inventory: {},
      time: {},
      npcs: state,
    });
  });

  it('maps the session projection name onto the location column', async () => {
    const state = { status: 'active', currentTick: 3 };

    await saveProjectionState({
      sessionId: 'session-test-001',
      name: 'session',
      state,
      lastEventSeq: 8n,
    });

    expect(valuesMock).toHaveBeenCalledWith({
      sessionId: 'session-test-001',
      lastEventSeq: 8n,
      updatedAt: expect.any(Date),
      location: state,
      inventory: {},
      time: {},
      npcs: {},
    });
    expect(onConflictDoUpdateMock).toHaveBeenCalledWith({
      target: dbModule.sessionProjections.sessionId,
      set: {
        location: state,
        lastEventSeq: 8n,
        updatedAt: expect.any(Date),
      },
    });
  });

  it('throws for unknown projection names', async () => {
    await expect(
      saveProjectionState({
        sessionId: 'session-test-001',
        name: 'unknown-projection',
        state: {},
        lastEventSeq: 1n,
      })
    ).rejects.toThrow('Unknown projection name: unknown-projection');

    expect(dbModule.insert).not.toHaveBeenCalled();
  });

  it('uses an upsert target on sessionId and writes the last event sequence', async () => {
    const state = {
      'loc-001': { id: 'loc-001', actors: ['actor-test-001'], items: [] },
    };

    await saveProjectionState({
      sessionId: 'session-test-001',
      name: 'location',
      state,
      lastEventSeq: 11n,
    });

    expect(onConflictDoUpdateMock).toHaveBeenCalledWith({
      target: dbModule.sessionProjections.sessionId,
      set: {
        location: state,
        lastEventSeq: 11n,
        updatedAt: expect.any(Date),
      },
    });
  });
});

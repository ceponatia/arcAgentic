import { beforeEach, describe, expect, it, vi } from 'vitest';

const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  updateSessionHeartbeat: vi.fn(),
}));

vi.mock('@arcagentic/logger', () => ({
  createLogger: vi.fn(() => loggerMock),
}));

vi.mock('@arcagentic/db', () => ({
  updateSessionHeartbeat: dbMocks.updateSessionHeartbeat,
}));

import { PresenceService } from '../../src/presence/presence-service.js';

describe('PresenceService', () => {
  let currentTime: Date;

  beforeEach(() => {
    vi.clearAllMocks();
    currentTime = new Date('2026-03-24T10:00:00.000Z');
    dbMocks.updateSessionHeartbeat.mockResolvedValue({ id: 'session-1' });
  });

  it('records a first heartbeat and resumes the world tick when a scheduler is present', async () => {
    const scheduler = {
      startWorldTick: vi.fn().mockResolvedValue(undefined),
      stopWorldTick: vi.fn(),
    };
    const service = new PresenceService({
      scheduler,
      now: () => currentTime,
      pauseThresholdMs: 60_000,
    });

    const result = await service.recordHeartbeat('session-1');

    expect(result).toEqual({
      sessionId: 'session-1',
      status: 'resumed',
      lastHeartbeatAt: currentTime,
    });
    expect(dbMocks.updateSessionHeartbeat).toHaveBeenCalledWith('session-1', currentTime);
    expect(scheduler.startWorldTick).toHaveBeenCalledWith('session-1');
    expect(service.getLastHeartbeat('session-1')).toEqual(currentTime);
  });

  it('records a first heartbeat as running when no scheduler is present', async () => {
    const service = new PresenceService({ now: () => currentTime, pauseThresholdMs: 60_000 });

    const result = await service.recordHeartbeat('session-1');

    expect(result.status).toBe('running');
  });

  it('returns running for subsequent heartbeats within the active threshold', async () => {
    const scheduler = {
      startWorldTick: vi.fn().mockResolvedValue(undefined),
      stopWorldTick: vi.fn(),
    };
    const service = new PresenceService({
      scheduler,
      now: () => currentTime,
      pauseThresholdMs: 60_000,
    });

    await service.recordHeartbeat('session-1');
    currentTime = new Date('2026-03-24T10:00:30.000Z');

    const result = await service.recordHeartbeat('session-1');

    expect(result.status).toBe('running');
    expect(scheduler.startWorldTick).toHaveBeenCalledTimes(1);
  });

  it('returns resumed again after inactivity exceeds the threshold', async () => {
    const scheduler = {
      startWorldTick: vi.fn().mockResolvedValue(undefined),
      stopWorldTick: vi.fn(),
    };
    const service = new PresenceService({
      scheduler,
      now: () => currentTime,
      pauseThresholdMs: 60_000,
    });

    await service.recordHeartbeat('session-1');
    currentTime = new Date('2026-03-24T10:02:01.000Z');

    const result = await service.recordHeartbeat('session-1');

    expect(result.status).toBe('resumed');
    expect(scheduler.startWorldTick).toHaveBeenCalledTimes(2);
  });

  it('continues when heartbeat persistence fails', async () => {
    dbMocks.updateSessionHeartbeat.mockRejectedValue(new Error('db offline'));
    const service = new PresenceService({ now: () => currentTime, pauseThresholdMs: 60_000 });

    const result = await service.recordHeartbeat('session-1');

    expect(result.status).toBe('running');
    expect(loggerMock.warn).toHaveBeenCalledTimes(1);
  });

  it('continues when scheduler resume fails', async () => {
    const scheduler = {
      startWorldTick: vi.fn().mockRejectedValue(new Error('scheduler offline')),
      stopWorldTick: vi.fn(),
    };
    const service = new PresenceService({
      scheduler,
      now: () => currentTime,
      pauseThresholdMs: 60_000,
    });

    const result = await service.recordHeartbeat('session-1');

    expect(result.status).toBe('resumed');
    expect(loggerMock.warn).toHaveBeenCalledTimes(1);
  });

  it('returns undefined for unknown session heartbeats', () => {
    const service = new PresenceService({ now: () => currentTime });

    expect(service.getLastHeartbeat('missing')).toBeUndefined();
  });

  it('lists tracked sessions', async () => {
    const service = new PresenceService({ now: () => currentTime });

    await service.recordHeartbeat('session-1');
    service.seedSession('session-2', new Date('2026-03-24T09:00:00.000Z'));

    expect(service.listSessions()).toEqual([
      { sessionId: 'session-1', lastHeartbeatAt: currentTime },
      { sessionId: 'session-2', lastHeartbeatAt: new Date('2026-03-24T09:00:00.000Z') },
    ]);
  });

  it('removes sessions from tracking', async () => {
    const service = new PresenceService({ now: () => currentTime });

    await service.recordHeartbeat('session-1');
    service.removeSession('session-1');

    expect(service.listSessions()).toEqual([]);
  });

  it('seeds an existing session heartbeat', () => {
    const service = new PresenceService({ now: () => currentTime });
    const seededAt = new Date('2026-03-24T08:30:00.000Z');

    service.seedSession('session-1', seededAt);

    expect(service.getLastHeartbeat('session-1')).toEqual(seededAt);
  });
});

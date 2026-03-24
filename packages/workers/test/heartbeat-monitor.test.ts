const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('@arcagentic/logger', () => ({
  createLogger: vi.fn(() => loggerMock),
}));

import type { PresenceRecord } from '@arcagentic/schemas';
import { HeartbeatMonitor } from '../src/heartbeat-monitor.js';

const fixedNow = new Date('2025-06-01T12:00:00.000Z');

function buildSession(sessionId: string, msAgo: number): PresenceRecord {
  return {
    sessionId,
    lastHeartbeatAt: new Date(fixedNow.getTime() - msAgo),
  };
}

describe('HeartbeatMonitor', () => {
  let mockPresence: {
    listSessions: ReturnType<typeof vi.fn>;
    removeSession: ReturnType<typeof vi.fn>;
  };
  let mockScheduler: {
    stopWorldTick: ReturnType<typeof vi.fn>;
  };

  function createMonitor(overrides: Partial<ConstructorParameters<typeof HeartbeatMonitor>[0]> = {}) {
    return new HeartbeatMonitor({
      presence: mockPresence,
      scheduler: mockScheduler,
      pauseThresholdMs: 300_000,
      intervalMs: 1_000,
      now: () => fixedNow,
      ...overrides,
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    mockPresence = {
      listSessions: vi.fn().mockReturnValue([]),
      removeSession: vi.fn(),
    };

    mockScheduler = {
      stopWorldTick: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when there are no tracked sessions', async () => {
    const monitor = createMonitor();

    await monitor.checkOnce();

    expect(mockScheduler.stopWorldTick).not.toHaveBeenCalled();
    expect(mockPresence.removeSession).not.toHaveBeenCalled();
  });

  it('does nothing when a session heartbeat is within the pause threshold', async () => {
    mockPresence.listSessions.mockReturnValue([buildSession('session-001', 120_000)]);
    const monitor = createMonitor();

    await monitor.checkOnce();

    expect(mockScheduler.stopWorldTick).not.toHaveBeenCalled();
    expect(mockPresence.removeSession).not.toHaveBeenCalled();
  });

  it('does nothing when a session heartbeat is exactly at the pause threshold', async () => {
    mockPresence.listSessions.mockReturnValue([buildSession('session-001', 300_000)]);
    const monitor = createMonitor();

    await monitor.checkOnce();

    expect(mockScheduler.stopWorldTick).not.toHaveBeenCalled();
    expect(mockPresence.removeSession).not.toHaveBeenCalled();
  });

  it('removes a stale session when the heartbeat exceeds the threshold', async () => {
    mockPresence.listSessions.mockReturnValue([buildSession('session-001', 300_001)]);
    const monitor = createMonitor();

    await monitor.checkOnce();

    expect(mockScheduler.stopWorldTick).toHaveBeenCalledWith('session-001');
    expect(mockPresence.removeSession).toHaveBeenCalledWith('session-001');
  });

  it('removes only stale sessions when fresh and stale sessions are mixed', async () => {
    mockPresence.listSessions.mockReturnValue([
      buildSession('fresh-session', 90_000),
      buildSession('stale-session', 450_000),
    ]);
    const monitor = createMonitor();

    await monitor.checkOnce();

    expect(mockScheduler.stopWorldTick).toHaveBeenCalledTimes(1);
    expect(mockScheduler.stopWorldTick).toHaveBeenCalledWith('stale-session');
    expect(mockPresence.removeSession).toHaveBeenCalledTimes(1);
    expect(mockPresence.removeSession).toHaveBeenCalledWith('stale-session');
  });

  it('removes each stale session when multiple sessions are stale', async () => {
    mockPresence.listSessions.mockReturnValue([
      buildSession('stale-001', 360_000),
      buildSession('stale-002', 420_000),
    ]);
    const monitor = createMonitor();

    await monitor.checkOnce();

    expect(mockScheduler.stopWorldTick).toHaveBeenCalledTimes(2);
    expect(mockPresence.removeSession).toHaveBeenCalledTimes(2);
    expect(mockPresence.removeSession).toHaveBeenNthCalledWith(1, 'stale-001');
    expect(mockPresence.removeSession).toHaveBeenNthCalledWith(2, 'stale-002');
  });

  it('continues processing later stale sessions when stopping one session fails', async () => {
    mockPresence.listSessions.mockReturnValue([
      buildSession('stale-error', 360_000),
      buildSession('stale-ok', 420_000),
    ]);
    mockScheduler.stopWorldTick
      .mockRejectedValueOnce(new Error('scheduler unavailable'))
      .mockResolvedValueOnce(undefined);
    const monitor = createMonitor();

    await expect(monitor.checkOnce()).resolves.toBeUndefined();

    expect(mockScheduler.stopWorldTick).toHaveBeenCalledTimes(2);
    expect(mockPresence.removeSession).toHaveBeenCalledTimes(1);
    expect(mockPresence.removeSession).toHaveBeenCalledWith('stale-ok');
  });

  it('starts an interval that triggers checks on schedule', async () => {
    const monitor = createMonitor();
    const checkSpy = vi.spyOn(monitor, 'checkOnce');

    monitor.start();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(checkSpy).toHaveBeenCalledTimes(1);
  });

  it('uses the configured interval when started', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const monitor = createMonitor({ intervalMs: 2_500 });

    monitor.start();

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 2_500);
  });

  it('start is idempotent when called multiple times', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const monitor = createMonitor();

    monitor.start();
    monitor.start();

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it('stop clears the running interval', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const monitor = createMonitor();

    monitor.start();
    monitor.stop();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it('stop is idempotent when called without a running interval', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const monitor = createMonitor();

    monitor.stop();
    monitor.stop();

    expect(clearIntervalSpy).not.toHaveBeenCalled();
  });

  it('does not run further checks after stop is called', async () => {
    const monitor = createMonitor();
    const checkSpy = vi.spyOn(monitor, 'checkOnce');

    monitor.start();
    monitor.stop();
    await vi.advanceTimersByTimeAsync(5_000);

    expect(checkSpy).not.toHaveBeenCalled();
  });
});

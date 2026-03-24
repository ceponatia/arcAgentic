const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('@arcagentic/logger', () => ({
  createLogger: vi.fn(() => loggerMock),
}));

import { Scheduler } from '../../src/scheduler/index.js';

describe('Scheduler', () => {
  function createQueue(repeatableJobs: Array<Record<string, unknown>> = []) {
    return {
      add: vi.fn().mockResolvedValue({ id: 'job-001' }),
      getRepeatableJobs: vi.fn().mockResolvedValue(repeatableJobs),
      removeRepeatableByKey: vi.fn().mockResolvedValue(undefined),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a repeatable tick job with the default interval', async () => {
    const queue = createQueue();
    const scheduler = new Scheduler(queue as never);

    await scheduler.startWorldTick('session-001');

    expect(queue.add).toHaveBeenCalledWith(
      'tick-session-001',
      {
        sessionId: 'session-001',
        payload: {
          tickCount: 0,
          timestamp: expect.any(Number),
        },
      },
      {
        repeat: {
          every: 1000,
        },
        removeOnComplete: true,
      }
    );
  });

  it('uses the provided interval when scheduling a world tick', async () => {
    const queue = createQueue();
    const scheduler = new Scheduler(queue as never);

    await scheduler.startWorldTick('session-001', 5_000);

    expect(queue.add).toHaveBeenCalledWith(
      'tick-session-001',
      expect.any(Object),
      expect.objectContaining({
        repeat: {
          every: 5_000,
        },
      })
    );
  });

  it('does not reschedule a session when an identical repeatable job already exists', async () => {
    const queue = createQueue([
      {
        name: 'tick-session-001',
        key: 'repeat-key-001',
        every: 1_000,
      },
    ]);
    const scheduler = new Scheduler(queue as never);

    await scheduler.startWorldTick('session-001');

    expect(queue.removeRepeatableByKey).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('replaces an existing repeatable job when the interval changes', async () => {
    const queue = createQueue([
      {
        name: 'tick-session-001',
        key: 'repeat-key-001',
        every: 5_000,
      },
    ]);
    const scheduler = new Scheduler(queue as never);

    await scheduler.startWorldTick('session-001', 1_000);

    expect(queue.removeRepeatableByKey).toHaveBeenCalledWith('repeat-key-001');
    expect(queue.add).toHaveBeenCalledTimes(1);
  });

  it('ignores repeatable jobs from other sessions when scheduling', async () => {
    const queue = createQueue([
      {
        name: 'tick-session-002',
        key: 'repeat-key-002',
        every: 1_000,
      },
    ]);
    const scheduler = new Scheduler(queue as never);

    await scheduler.startWorldTick('session-001');

    expect(queue.removeRepeatableByKey).not.toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledTimes(1);
  });

  it('removes the matching repeatable job when stopping a world tick', async () => {
    const queue = createQueue([
      {
        name: 'tick-session-001',
        key: 'repeat-key-001',
      },
    ]);
    const scheduler = new Scheduler(queue as never);

    await scheduler.stopWorldTick('session-001');

    expect(queue.removeRepeatableByKey).toHaveBeenCalledWith('repeat-key-001');
  });

  it('removes all matching repeatable jobs when duplicates exist', async () => {
    const queue = createQueue([
      {
        name: 'tick-session-001',
        key: 'repeat-key-001',
      },
      {
        name: 'tick-session-001',
        key: 'repeat-key-002',
      },
    ]);
    const scheduler = new Scheduler(queue as never);

    await scheduler.stopWorldTick('session-001');

    expect(queue.removeRepeatableByKey).toHaveBeenCalledTimes(2);
    expect(queue.removeRepeatableByKey).toHaveBeenNthCalledWith(1, 'repeat-key-001');
    expect(queue.removeRepeatableByKey).toHaveBeenNthCalledWith(2, 'repeat-key-002');
  });

  it('does nothing when no repeatable job matches the session being stopped', async () => {
    const queue = createQueue([
      {
        name: 'tick-session-002',
        key: 'repeat-key-002',
      },
    ]);
    const scheduler = new Scheduler(queue as never);

    await scheduler.stopWorldTick('session-001');

    expect(queue.removeRepeatableByKey).not.toHaveBeenCalled();
  });
});

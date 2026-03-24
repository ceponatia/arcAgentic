import { mockBus } from '../../../../config/vitest/mocks/bus.js';
import { createTickProcessor } from '../../src/processors/tick.js';

function createTickJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    data: {
      sessionId: 'session-001',
      payload: {
        tickCount: 5,
        timestamp: Date.parse('2025-06-01T12:00:00.000Z'),
      },
    },
    id: 'job-001',
    name: 'tick',
    ...overrides,
  };
}

describe('createTickProcessor', () => {
  it('emits a TICK event with the expected tick count and timestamp', async () => {
    const bus = mockBus();
    const processor = createTickProcessor(bus as never);

    await processor(createTickJob() as never);

    expect(bus.emit).toHaveBeenCalledWith({
      type: 'TICK',
      tick: 5,
      timestamp: new Date('2025-06-01T12:00:00.000Z'),
    });
  });

  it('returns success and a single emitted event when the bus emit succeeds', async () => {
    const bus = mockBus();
    const processor = createTickProcessor(bus as never);

    const result = await processor(createTickJob() as never);

    expect(result).toEqual({
      success: true,
      eventsEmitted: 1,
    });
  });

  it('passes the payload timestamp through as a Date instance', async () => {
    const bus = mockBus();
    const processor = createTickProcessor(bus as never);

    await processor(
      createTickJob({
        data: {
          sessionId: 'session-001',
          payload: {
            tickCount: 9,
            timestamp: 1_735_689_600_000,
          },
        },
      }) as never
    );

    expect(bus.emit).toHaveBeenCalledWith({
      type: 'TICK',
      tick: 9,
      timestamp: new Date(1_735_689_600_000),
    });
  });

  it('returns a failure result when bus.emit throws an Error', async () => {
    const bus = mockBus();
    bus.emit.mockRejectedValueOnce(new Error('emit failed'));
    const processor = createTickProcessor(bus as never);

    const result = await processor(createTickJob() as never);

    expect(result).toEqual({
      success: false,
      error: 'emit failed',
    });
  });

  it('returns a failure result when bus.emit throws a non-Error value', async () => {
    const bus = mockBus();
    bus.emit.mockRejectedValueOnce('emit failed');
    const processor = createTickProcessor(bus as never);

    const result = await processor(createTickJob() as never);

    expect(result).toEqual({
      success: false,
      error: 'emit failed',
    });
  });
});

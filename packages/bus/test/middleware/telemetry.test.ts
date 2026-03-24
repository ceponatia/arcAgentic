const { getTracerMock, startActiveSpanMock, mockSpan } = vi.hoisted(() => {
  const span = {
    setAttribute: vi.fn(),
    setStatus: vi.fn(),
    recordException: vi.fn(),
    end: vi.fn(),
  };

  return {
    getTracerMock: vi.fn(() => ({
      startActiveSpan: startActiveSpanMock,
    })),
    startActiveSpanMock: vi.fn((name: string, fn: (span: typeof span) => unknown) => fn(span)),
    mockSpan: span,
  };
});

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: getTracerMock,
  },
}));

vi.mock('../../src/core/redis-client.js', () => ({
  redis: { on: vi.fn() },
  pubRedis: { on: vi.fn() },
  subRedis: { on: vi.fn() },
}));

import { buildMoveIntent, buildTickEvent } from '../../../../config/vitest/builders/world-event.js';
import { telemetryMiddleware } from '../../src/middleware/telemetry.js';

describe('telemetryMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a span named with the event type', async () => {
    await telemetryMiddleware(buildMoveIntent(), vi.fn().mockResolvedValue(undefined));

    expect(startActiveSpanMock).toHaveBeenCalledWith('bus:MOVE_INTENT', expect.any(Function));
  });

  it('sets the event.type attribute', async () => {
    await telemetryMiddleware(buildMoveIntent(), vi.fn().mockResolvedValue(undefined));

    expect(mockSpan.setAttribute).toHaveBeenCalledWith('event.type', 'MOVE_INTENT');
  });

  it('sets the session.id attribute when the event has a session id', async () => {
    await telemetryMiddleware(buildTickEvent(), vi.fn().mockResolvedValue(undefined));

    expect(mockSpan.setAttribute).toHaveBeenCalledWith('session.id', 'session-test-001');
  });

  it('calls next inside the active span', async () => {
    const next = vi.fn().mockResolvedValue(undefined);

    await telemetryMiddleware(buildMoveIntent(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('sets a success status when next completes', async () => {
    await telemetryMiddleware(buildMoveIntent(), vi.fn().mockResolvedValue(undefined));

    expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 0 });
  });

  it('records exceptions and sets an error status when next throws', async () => {
    const error = new Error('next failed');

    await expect(
      telemetryMiddleware(buildMoveIntent(), vi.fn().mockRejectedValue(error))
    ).rejects.toThrow('next failed');

    expect(mockSpan.recordException).toHaveBeenCalledWith(error);
    expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 1, message: 'next failed' });
  });

  it('always ends the span', async () => {
    const error = new Error('next failed');

    await telemetryMiddleware(buildMoveIntent(), vi.fn().mockResolvedValue(undefined));
    await expect(
      telemetryMiddleware(buildMoveIntent(), vi.fn().mockRejectedValue(error))
    ).rejects.toThrow('next failed');

    expect(mockSpan.end).toHaveBeenCalledTimes(2);
  });
});

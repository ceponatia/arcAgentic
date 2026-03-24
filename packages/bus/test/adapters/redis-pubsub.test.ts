const { mockPubRedis, mockSubRedis, mockLogError } = vi.hoisted(() => ({
  mockPubRedis: {
    publish: vi.fn().mockResolvedValue(1),
  },
  mockSubRedis: {
    subscribe: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  },
  mockLogError: vi.fn(),
}));

vi.mock('../../src/core/redis-client.js', () => ({
  redis: { on: vi.fn() },
  pubRedis: mockPubRedis,
  subRedis: mockSubRedis,
}));

vi.mock('@arcagentic/logger', () => ({
  createLogger: vi.fn(() => ({
    error: mockLogError,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  })),
}));

import { buildMoveIntent, buildTickEvent } from '../../../../config/vitest/builders/world-event.js';
import { RedisPubSubAdapter } from '../../src/adapters/redis-pubsub.js';

describe('RedisPubSubAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogError.mockClear();
  });

  function getMessageListener(): (channel: string, message: string) => void {
    expect(mockSubRedis.on).toHaveBeenCalledWith('message', expect.any(Function));
    return mockSubRedis.on.mock.calls[0][1] as (channel: string, message: string) => void;
  }

  it('publishes JSON-stringified events on the world-events channel', async () => {
    const adapter = new RedisPubSubAdapter();
    const event = buildMoveIntent();

    await adapter.publish(event);

    expect(mockPubRedis.publish).toHaveBeenCalledTimes(1);
    expect(mockPubRedis.publish).toHaveBeenCalledWith('world-events', JSON.stringify(event));
  });

  it('adds the first handler and subscribes to the Redis channel once', async () => {
    const adapter = new RedisPubSubAdapter();
    const handler = vi.fn();

    await adapter.subscribe(handler);

    expect(mockSubRedis.subscribe).toHaveBeenCalledTimes(1);
    expect(mockSubRedis.subscribe).toHaveBeenCalledWith('world-events');
    expect(mockSubRedis.on).toHaveBeenCalledTimes(1);
  });

  it('adds subsequent handlers without resubscribing to Redis', async () => {
    const adapter = new RedisPubSubAdapter();

    await adapter.subscribe(vi.fn());
    await adapter.subscribe(vi.fn());

    expect(mockSubRedis.subscribe).toHaveBeenCalledTimes(1);
    expect(mockSubRedis.on).toHaveBeenCalledTimes(1);
  });

  it('removes handlers on unsubscribe', async () => {
    const adapter = new RedisPubSubAdapter();
    const handler = vi.fn();

    await adapter.subscribe(handler);
    adapter.unsubscribe(handler);
    getMessageListener()('world-events', JSON.stringify(buildMoveIntent()));

    expect(handler).not.toHaveBeenCalled();
  });

  it('parses valid messages and dispatches them to all handlers', async () => {
    const adapter = new RedisPubSubAdapter();
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();

    await adapter.subscribe(firstHandler);
    await adapter.subscribe(secondHandler);

    getMessageListener()('world-events', JSON.stringify(buildTickEvent()));

    expect(firstHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TICK',
        sessionId: 'session-test-001',
        tick: 1,
        timestamp: expect.any(Date),
      })
    );
    expect(secondHandler).toHaveBeenCalledTimes(1);
  });

  it('logs parse errors for invalid JSON and does not dispatch', async () => {
    const adapter = new RedisPubSubAdapter();
    const handler = vi.fn();

    await adapter.subscribe(handler);
    getMessageListener()('world-events', '{invalid-json');

    expect(mockLogError).toHaveBeenCalledTimes(1);
    expect(mockLogError).toHaveBeenCalledWith(
      expect.objectContaining({
        err: expect.any(Error),
        channel: 'world-events',
      }),
      'failed to parse redis event message'
    );
    expect(handler).not.toHaveBeenCalled();
  });

  it('catches and logs async handler errors', async () => {
    const adapter = new RedisPubSubAdapter();
    const error = new Error('handler failed');
    const handler = vi.fn().mockRejectedValue(error);

    await adapter.subscribe(handler);
    getMessageListener()('world-events', JSON.stringify(buildMoveIntent()));
    await Promise.resolve();
    await Promise.resolve();

    expect(mockLogError).toHaveBeenCalledWith(
      expect.objectContaining({ err: error }),
      'event handler failed'
    );
  });
});

vi.mock('../src/adapters/redis-pubsub.js', () => ({
  redisPubSub: {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn(),
  },
}));

vi.mock('../src/core/redis-client.js', () => ({
  redis: { on: vi.fn() },
  pubRedis: { on: vi.fn() },
  subRedis: { on: vi.fn() },
}));

import { buildMoveIntent, buildTickEvent } from '../../../config/vitest/builders/world-event.js';
import { redisPubSub } from '../src/adapters/redis-pubsub.js';
import { WorldBus } from '../src/index.js';

describe('WorldBus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes via the adapter when no middleware is registered', async () => {
    const bus = new WorldBus();
    const event = buildMoveIntent();

    await bus.emit(event);

    expect(redisPubSub.publish).toHaveBeenCalledTimes(1);
    expect(redisPubSub.publish).toHaveBeenCalledWith(event);
  });

  it('runs middleware in registration order', async () => {
    const bus = new WorldBus();
    const event = buildTickEvent();
    const calls: string[] = [];

    bus.use(async (_event, next) => {
      calls.push('first');
      await next();
    });

    bus.use(async (_event, next) => {
      calls.push('second');
      await next();
    });

    await bus.emit(event);

    expect(calls).toEqual(['first', 'second']);
    expect(redisPubSub.publish).toHaveBeenCalledWith(event);
  });

  it('calls the middleware next chain before publishing', async () => {
    const bus = new WorldBus();
    const event = buildMoveIntent();
    const calls: string[] = [];

    bus.use(async (_event, next) => {
      calls.push('a:start');
      await next();
      calls.push('a:end');
    });

    bus.use(async (_event, next) => {
      calls.push('b:start');
      await next();
      calls.push('b:end');
    });

    await bus.emit(event);

    expect(calls).toEqual(['a:start', 'b:start', 'b:end', 'a:end']);
    expect(redisPubSub.publish).toHaveBeenCalledTimes(1);
  });

  it('allows middleware to stop the chain by not calling next', async () => {
    const bus = new WorldBus();
    const event = buildMoveIntent();
    const downstream = vi.fn(async (_innerEvent, next) => {
      await next();
    });

    bus.use(async () => { });
    bus.use(downstream);

    await bus.emit(event);

    expect(downstream).not.toHaveBeenCalled();
    expect(redisPubSub.publish).not.toHaveBeenCalled();
  });

  it('delegates subscribe to the adapter', async () => {
    const bus = new WorldBus();
    const handler = vi.fn();

    await bus.subscribe(handler);

    expect(redisPubSub.subscribe).toHaveBeenCalledTimes(1);
    expect(redisPubSub.subscribe).toHaveBeenCalledWith(handler);
  });

  it('delegates unsubscribe to the adapter', () => {
    const bus = new WorldBus();
    const handler = vi.fn();

    bus.unsubscribe(handler);

    expect(redisPubSub.unsubscribe).toHaveBeenCalledTimes(1);
    expect(redisPubSub.unsubscribe).toHaveBeenCalledWith(handler);
  });

  it('calls middleware added via use during emit', async () => {
    const bus = new WorldBus();
    const event = buildTickEvent();
    const middleware = vi.fn(async (_innerEvent, next) => {
      await next();
    });

    bus.use(middleware);
    await bus.emit(event);

    expect(middleware).toHaveBeenCalledTimes(1);
    expect(middleware).toHaveBeenCalledWith(event, expect.any(Function));
  });

  it('executes multiple middleware functions in registration order', async () => {
    const bus = new WorldBus();
    const event = buildMoveIntent();
    const order: string[] = [];

    bus.use(async (_event, next) => {
      order.push('one');
      await next();
    });

    bus.use(async (_event, next) => {
      order.push('two');
      await next();
    });

    bus.use(async (_event, next) => {
      order.push('three');
      await next();
    });

    await bus.emit(event);

    expect(order).toEqual(['one', 'two', 'three']);
  });

  it('propagates middleware errors', async () => {
    const bus = new WorldBus();
    const event = buildTickEvent();

    bus.use(async () => {
      throw new Error('middleware failed');
    });

    await expect(bus.emit(event)).rejects.toThrow('middleware failed');
    expect(redisPubSub.publish).not.toHaveBeenCalled();
  });
});

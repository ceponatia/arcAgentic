vi.mock('../../src/core/redis-client.js', () => ({
  redis: { on: vi.fn() },
  pubRedis: { on: vi.fn() },
  subRedis: { on: vi.fn() },
}));

const mockLogError = vi.fn();

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

import { buildSpokeEffect } from '../../../../config/vitest/builders/world-event.js';

describe('persistenceMiddleware', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockLogError.mockClear();
  });

  it('calls next when no handler is registered', async () => {
    const { persistenceMiddleware } = await import('../../src/middleware/persistence.js');
    const next = vi.fn().mockResolvedValue(undefined);

    await persistenceMiddleware(buildSpokeEffect(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it('calls the registered handler before next', async () => {
    const { persistenceMiddleware, registerPersistenceHandler } = await import(
      '../../src/middleware/persistence.js'
    );
    const event = buildSpokeEffect();
    const handler = vi.fn().mockResolvedValue(undefined);
    const next = vi.fn().mockResolvedValue(undefined);

    registerPersistenceHandler(handler);
    await persistenceMiddleware(event, next);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('logs handler errors and still calls next', async () => {
    const { persistenceMiddleware, registerPersistenceHandler } = await import(
      '../../src/middleware/persistence.js'
    );
    const error = new Error('persist failed');
    const handler = vi.fn().mockRejectedValue(error);
    const next = vi.fn().mockResolvedValue(undefined);

    registerPersistenceHandler(handler);
    await persistenceMiddleware(buildSpokeEffect(), next);

    expect(mockLogError).toHaveBeenCalledTimes(1);
    expect(mockLogError).toHaveBeenCalledWith(
      expect.objectContaining({ err: error }),
      'failed to persist event'
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('replaces the registered handler when registerPersistenceHandler is called again', async () => {
    const { persistenceMiddleware, registerPersistenceHandler } = await import(
      '../../src/middleware/persistence.js'
    );
    const firstHandler = vi.fn().mockResolvedValue(undefined);
    const secondHandler = vi.fn().mockResolvedValue(undefined);
    const event = buildSpokeEffect();

    registerPersistenceHandler(firstHandler);
    registerPersistenceHandler(secondHandler);
    await persistenceMiddleware(event, vi.fn().mockResolvedValue(undefined));

    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledWith(event);
  });
});

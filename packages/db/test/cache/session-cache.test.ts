import { beforeEach, describe, expect, it, vi } from 'vitest';

const redisClient = vi.hoisted(() => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  quit: vi.fn().mockResolvedValue('OK'),
}));

const redisConstructor = vi.hoisted(() =>
  vi.fn(function MockRedis() {
    return redisClient;
  })
);
const configMock = vi.hoisted(() => ({
  getSessionCacheConfig: vi.fn(() => ({ redisUrl: 'redis://cache.test:6379' })),
}));

vi.mock('ioredis', () => ({
  Redis: redisConstructor,
  default: redisConstructor,
}));

vi.mock('../../src/cache/config.js', () => configMock);

import {
  getCachedSession,
  invalidateSessionCache,
  sessionCache,
  setCachedSession,
} from '../../src/cache/session-cache.js';

describe('session cache', () => {
  beforeEach(() => {
    redisClient.get.mockClear();
    redisClient.set.mockClear();
    redisClient.del.mockClear();
    redisClient.quit.mockClear();
  });

  it('creates the Redis client with the configured URL and session key prefix', () => {
    expect(redisConstructor).toHaveBeenCalledWith('redis://cache.test:6379', {
      keyPrefix: 'session:',
    });
    expect(sessionCache).toBe(redisClient);
  });

  it('returns null when a cached session is missing', async () => {
    redisClient.get.mockResolvedValueOnce(null);

    await expect(getCachedSession('session-1')).resolves.toBeNull();
    expect(redisClient.get).toHaveBeenCalledWith('session-1');
  });

  it('parses and returns cached JSON payloads', async () => {
    redisClient.get.mockResolvedValueOnce('{"id":"session-1","status":"active"}');

    await expect(getCachedSession<{ id: string; status: string }>('session-1')).resolves.toEqual({
      id: 'session-1',
      status: 'active',
    });
  });

  it('stores cached sessions with the default ttl', async () => {
    await setCachedSession('session-1', { id: 'session-1', status: 'active' });

    expect(redisClient.set).toHaveBeenCalledWith(
      'session-1',
      JSON.stringify({ id: 'session-1', status: 'active' }),
      'EX',
      3600
    );
  });

  it('stores cached sessions with a custom ttl when provided', async () => {
    await setCachedSession('session-1', { id: 'session-1' }, 120);

    expect(redisClient.set).toHaveBeenCalledWith(
      'session-1',
      JSON.stringify({ id: 'session-1' }),
      'EX',
      120
    );
  });

  it('invalidates cached sessions by key', async () => {
    await invalidateSessionCache('session-1');

    expect(redisClient.del).toHaveBeenCalledWith('session-1');
  });
});

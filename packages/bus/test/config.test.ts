vi.mock('../src/core/redis-client.js', () => ({
  redis: { on: vi.fn() },
  pubRedis: { on: vi.fn() },
  subRedis: { on: vi.fn() },
}));

import { getRedisUrl } from '../src/config.js';

describe('getRedisUrl', () => {
  const originalRedisUrl = process.env['REDIS_URL'];

  afterEach(() => {
    if (originalRedisUrl === undefined) {
      delete process.env['REDIS_URL'];
      return;
    }

    process.env['REDIS_URL'] = originalRedisUrl;
  });

  it('returns REDIS_URL when it is set', () => {
    process.env['REDIS_URL'] = 'redis://example:6379';

    expect(getRedisUrl()).toBe('redis://example:6379');
  });

  it('returns the default Redis URL when REDIS_URL is not set', () => {
    delete process.env['REDIS_URL'];

    expect(getRedisUrl()).toBe('redis://localhost:6379');
  });
});

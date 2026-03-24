import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestApp } from '../../../../config/vitest/hono/create-test-client.js';
import { createRateLimiter } from '../../src/middleware/rate-limiter.js';

function createLimitedApp(maxRequests = 2, windowMs = 1_000) {
  const app = createTestApp();
  const limiter = createRateLimiter({ maxRequests, windowMs });

  app.use('/limited', limiter);
  app.get('/limited', (c) => c.json({ ok: true }, 200));

  return app;
}

function getRequestWithIp(path: string, ip: string): Request {
  return new Request(`http://localhost${path}`, {
    headers: {
      'x-forwarded-for': ip,
    },
  });
}

describe('rate limiter middleware', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-24T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the in-memory fallback when no redis client is configured', async () => {
    const response = await createLimitedApp().request(getRequestWithIp('/limited', '198.51.100.1'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('allows requests within the configured limit', async () => {
    const app = createLimitedApp(2, 1_000);

    const first = await app.request(getRequestWithIp('/limited', '198.51.100.2'));
    const second = await app.request(getRequestWithIp('/limited', '198.51.100.2'));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.headers.get('X-RateLimit-Limit')).toBe('2');
    expect(second.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('returns 429 when requests exceed the limit', async () => {
    const app = createLimitedApp(2, 1_000);
    const ip = '198.51.100.3';

    await app.request(getRequestWithIp('/limited', ip));
    await app.request(getRequestWithIp('/limited', ip));
    const response = await app.request(getRequestWithIp('/limited', ip));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: 'Too many requests',
      retryAfter: 1,
    });
  });

  it('sets standard rate limit headers', async () => {
    const response = await createLimitedApp(2, 1_000).request(
      getRequestWithIp('/limited', '198.51.100.4')
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('2');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('1');
    expect(response.headers.get('X-RateLimit-Reset')).toBe('1774353601');
  });
});

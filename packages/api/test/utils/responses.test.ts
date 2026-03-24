import { describe, expect, it } from 'vitest';

import {
  createTestApp,
  getRequest,
} from '../../../../config/vitest/hono/create-test-client.js';
import {
  badRequest,
  conflict,
  forbidden,
  noContent,
  notFound,
  serverError,
} from '../../src/utils/responses.js';

function createResponseApp() {
  const app = createTestApp();

  app.get('/not-found', (c) => notFound(c, 'missing'));
  app.get('/bad-request', (c) => badRequest(c, 'invalid input'));
  app.get('/server-error', (c) => serverError(c, 'boom'));
  app.get('/forbidden', (c) => forbidden(c, 'denied'));
  app.get('/conflict', (c) => conflict(c, 'duplicate'));
  app.get('/no-content', (c) => noContent(c));

  return app;
}

describe('response helpers', () => {
  it.each([
    ['/not-found', 404, { ok: false, error: 'missing' }],
    ['/bad-request', 400, { ok: false, error: 'invalid input' }],
    ['/server-error', 500, { ok: false, error: 'boom' }],
    ['/forbidden', 403, { ok: false, error: 'denied' }],
    ['/conflict', 409, { ok: false, error: 'duplicate' }],
  ])('returns the expected JSON response for %s', async (path, status, body) => {
    const response = await createResponseApp().request(getRequest(path));

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual(body);
  });

  it('returns a 204 response with no body for noContent', async () => {
    const response = await createResponseApp().request(getRequest('/no-content'));

    expect(response.status).toBe(204);
    await expect(response.text()).resolves.toBe('');
  });
});

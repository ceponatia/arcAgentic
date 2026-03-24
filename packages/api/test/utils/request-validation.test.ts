import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  createTestApp,
  jsonRequest,
  postRequest,
} from '../../../../config/vitest/hono/create-test-client.js';
import {
  validateBody,
  validateOptionalBody,
  validateParam,
  validateQuery,
} from '../../src/utils/request-validation.js';

function createValidationApp() {
  const app = createTestApp();

  app.post('/body', async (c) => {
    const result = await validateBody(c, z.object({ name: z.string().min(1) }));
    if (!result.success) return result.errorResponse;
    return c.json({ ok: true, data: result.data }, 200);
  });

  app.post('/optional', async (c) => {
    const result = await validateOptionalBody(c, z.object({ enabled: z.boolean() }));
    if (!result.success) return result.errorResponse;
    return c.json(
      {
        ok: true,
        hasData: result.data !== undefined,
        data: result.data ?? null,
      },
      200
    );
  });

  app.get('/query', (c) => {
    const result = validateQuery(
      c,
      z.object({
        page: z.coerce.number().int().positive(),
      })
    );
    if (!result.success) return result.errorResponse;
    return c.json({ ok: true, data: result.data }, 200);
  });

  app.get('/items/:id', (c) => {
    const result = validateParam(c, 'id', z.string().regex(/^item-\d+$/, 'invalid item id'));
    if (!result.success) return result.errorResponse;
    return c.json({ ok: true, id: result.data }, 200);
  });

  return app;
}

describe('request validation helpers', () => {
  it('validates a JSON body against a schema', async () => {
    const response = await createValidationApp().request(postRequest('/body', { name: 'Mara' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data: { name: 'Mara' } });
  });

  it('returns a bad request response for invalid JSON bodies', async () => {
    const request = new Request('http://localhost/body', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad-json',
    });

    const response = await createValidationApp().request(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'invalid json body' });
  });

  it('treats missing and null optional bodies as undefined', async () => {
    const app = createValidationApp();

    const missingResponse = await app.request(new Request('http://localhost/optional', { method: 'POST' }));
    const nullResponse = await app.request(postRequest('/optional', null));

    expect(missingResponse.status).toBe(200);
    await expect(missingResponse.json()).resolves.toEqual({
      ok: true,
      hasData: false,
      data: null,
    });
    expect(nullResponse.status).toBe(200);
    await expect(nullResponse.json()).resolves.toEqual({
      ok: true,
      hasData: false,
      data: null,
    });
  });

  it('validates query parameters with coercion', async () => {
    const response = await createValidationApp().request(new Request('http://localhost/query?page=2'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data: { page: 2 } });
  });

  it('returns flattened validation errors for invalid query params', async () => {
    const response = await createValidationApp().request(new Request('http://localhost/query?page=nope'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        formErrors: [],
        fieldErrors: {
          page: ['Invalid input: expected number, received NaN'],
        },
      },
    });
  });

  it('validates route params', async () => {
    const response = await createValidationApp().request(new Request('http://localhost/items/item-42'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, id: 'item-42' });
  });

  it('returns flattened validation errors for invalid route params', async () => {
    const response = await createValidationApp().request(new Request('http://localhost/items/not-an-item'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        formErrors: ['invalid item id'],
        fieldErrors: {},
      },
    });
  });

  it('returns flattened validation errors for schema-invalid bodies', async () => {
    const response = await createValidationApp().request(jsonRequest('POST', '/body', { name: '' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        formErrors: [],
        fieldErrors: {
          name: ['Too small: expected string to have >=1 characters'],
        },
      },
    });
  });
});

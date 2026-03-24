import { Hono } from 'hono';

export interface TestClientOptions {
  authToken?: string;
  authBypass?: boolean;
}

/**
 * Create a fresh Hono app instance for route testing.
 * Callers register routes on the returned app, then use `app.request()` to send test requests.
 */
export function createTestApp(): Hono {
  return new Hono();
}

/**
 * Build a JSON request for Hono's `app.request()` method.
 */
export function jsonRequest(
  method: string,
  path: string,
  body?: unknown,
  options?: TestClientOptions
): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options?.authToken) {
    headers.Authorization = `Bearer ${options.authToken}`;
  }

  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * Shorthand for GET requests.
 */
export function getRequest(path: string, options?: TestClientOptions): Request {
  return jsonRequest('GET', path, undefined, options);
}

/**
 * Shorthand for POST requests.
 */
export function postRequest(path: string, body?: unknown, options?: TestClientOptions): Request {
  return jsonRequest('POST', path, body, options);
}

/**
 * Shorthand for PUT requests.
 */
export function putRequest(path: string, body?: unknown, options?: TestClientOptions): Request {
  return jsonRequest('PUT', path, body, options);
}

/**
 * Shorthand for DELETE requests.
 */
export function deleteRequest(path: string, options?: TestClientOptions): Request {
  return jsonRequest('DELETE', path, undefined, options);
}

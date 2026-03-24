import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../auth/accessToken.js', () => ({
  getAccessToken: vi.fn(),
}));

import { getAccessToken } from '../auth/accessToken.js';
import { http } from './http.js';

describe('http', () => {
  const getAccessTokenMock = vi.mocked(getAccessToken);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    getAccessTokenMock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns parsed JSON for a successful request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(http<{ ok: boolean }>('/health')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/health',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('injects the auth token as a bearer header', async () => {
    getAccessTokenMock.mockResolvedValue('token-123');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await http('/secure');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/secure',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
      })
    );
  });

  it('aborts the request when the timeout is reached', async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        })
    );
    vi.stubGlobal('fetch', fetchMock);

    const requestPromise = http('/slow', { timeoutMs: 25 });
    const expectation = expect(requestPromise).rejects.toThrow('Request timed out');

    await vi.advanceTimersByTimeAsync(25);

    await expectation;
  });

  it('returns undefined for 204 no content responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(http<void>('/empty')).resolves.toBeUndefined();
  });

  it('surfaces server-provided JSON error messages', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Something went wrong' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(http('/error')).rejects.toThrow('HTTP 500: Something went wrong');
  });

  it('rethrows network failures with their message', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(http('/offline')).rejects.toThrow('Failed to fetch');
  });
});

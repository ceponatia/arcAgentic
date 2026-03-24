import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./http.js', () => ({
  http: vi.fn(),
}));

import { MESSAGE_TIMEOUT_MS } from '../../config.js';
import { http } from './http.js';
import {
  createSession,
  deleteSession,
  getSession,
  getSessions,
  sendMessage,
} from './sessions.js';

describe('sessions API client', () => {
  const httpMock = vi.mocked(http);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSessions calls the sessions endpoint and returns the list', async () => {
    const sessions = [{ id: 'session-1', status: 'active' }] as never[];
    httpMock.mockResolvedValueOnce(sessions);

    await expect(getSessions()).resolves.toBe(sessions);
    expect(httpMock).toHaveBeenCalledWith('/sessions', undefined);
  });

  it('createSession sends a POST with the expected body', async () => {
    httpMock.mockResolvedValueOnce({ id: 'session-1' } as never);

    await createSession('character-1', 'setting-1', ['tag-1']);

    expect(httpMock).toHaveBeenCalledWith('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterId: 'character-1',
        settingId: 'setting-1',
        tagIds: ['tag-1'],
      }),
    });
  });

  it('deleteSession sends DELETE to the session endpoint', async () => {
    httpMock.mockResolvedValueOnce(undefined as never);

    await deleteSession('session-1');

    expect(httpMock).toHaveBeenCalledWith('/sessions/session-1', {
      method: 'DELETE',
    });
  });

  it('sendMessage posts a turn for the session id and content', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-24T12:00:00.000Z'));
    httpMock.mockResolvedValueOnce({
      message: 'The room is quiet.',
      events: [{ type: 'LOOK_RESULT' }],
      success: true,
    } as never);

    const result = await sendMessage('session-1', 'look around');

    expect(httpMock).toHaveBeenCalledWith('/sessions/session-1/turns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'look around', npcId: undefined }),
      timeoutMs: MESSAGE_TIMEOUT_MS,
    });
    expect(result.message).toMatchObject({
      role: 'assistant',
      content: 'The room is quiet.',
      createdAt: '2026-03-24T12:00:00.000Z',
    });
    expect(result.events).toEqual([{ type: 'LOOK_RESULT' }]);

    vi.useRealTimers();
  });

  it('getSession calls GET for the provided session id', async () => {
    const session = { id: 'session-1' } as never;
    httpMock.mockResolvedValueOnce(session);

    await expect(getSession('session-1')).resolves.toBe(session);
    expect(httpMock).toHaveBeenCalledWith('/sessions/session-1', undefined);
  });
});

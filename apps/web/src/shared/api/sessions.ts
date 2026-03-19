import { http } from './http.js';
import { MESSAGE_TIMEOUT_MS } from '../../config.js';
import type {
  Message,
  Session,
  SessionSummary,
  NpcInstanceSummary,
  TurnMetadata,
} from '../../types.js';
import type { CreateFullSessionRequest, CreateFullSessionResponse } from './types.js';

interface TurnEndpointResponse {
  message: string;
  events: unknown[];
  stateChanges?: unknown;
  metadata?: TurnMetadata;
  speaker?: { actorId: string; name?: string };
  success: boolean;
}

export interface CreateSessionResponseShort {
  id: string;
  playerCharacterId: string;
  settingId: string;
  createdAt: string;
}

export interface SessionHeartbeatResponse {
  ok: true;
  sessionId: string;
  status: 'running' | 'resumed';
  lastHeartbeat: string;
}

export async function getSessions(signal?: AbortSignal): Promise<SessionSummary[]> {
  return http<SessionSummary[]>('/sessions', signal ? { signal } : undefined);
}

export async function getSession(sessionId: string, signal?: AbortSignal): Promise<Session> {
  return http<Session>(
    `/sessions/${encodeURIComponent(sessionId)}`,
    signal ? { signal } : undefined
  );
}

export async function getSessionNpcs(
  sessionId: string,
  signal?: AbortSignal
): Promise<NpcInstanceSummary[]> {
  const res = await http<{ ok: boolean; npcs: NpcInstanceSummary[] }>(
    `/sessions/${encodeURIComponent(sessionId)}/npcs`,
    signal ? { signal } : undefined
  );
  return res.npcs ?? [];
}

export async function createSession(
  characterId: string,
  settingId: string,
  tagIds?: string[],
  signal?: AbortSignal
): Promise<CreateSessionResponseShort> {
  return http<CreateSessionResponseShort>('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, settingId, tagIds }),
    ...(signal && { signal }),
  });
}

export async function createSessionFull(
  config: CreateFullSessionRequest,
  signal?: AbortSignal
): Promise<CreateFullSessionResponse> {
  return http<CreateFullSessionResponse>('/sessions/create-full', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
    ...(signal && { signal }),
  });
}

export async function deleteSession(sessionId: string, signal?: AbortSignal): Promise<void> {
  await http<void>(`/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    ...(signal && { signal }),
  });
}

export async function renameSession(
  sessionId: string,
  title: string,
  signal?: AbortSignal
): Promise<void> {
  await http<void>(`/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
    ...(signal && { signal }),
  });
}

export async function getSessionMessages(
  sessionId: string,
  signal?: AbortSignal
): Promise<Message[]> {
  return http<Message[]>(
    `/sessions/${encodeURIComponent(sessionId)}/messages`,
    signal ? { signal } : undefined
  );
}

export async function sendMessage(
  sessionId: string,
  content: string,
  signal?: AbortSignal,
  options?: { npcId?: string | null }
): Promise<{ message: Message; events?: unknown[]; stateChanges?: unknown }> {
  const result = await http<TurnEndpointResponse>(
    `/sessions/${encodeURIComponent(sessionId)}/turns`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: content, npcId: options?.npcId ?? undefined }),
      timeoutMs: MESSAGE_TIMEOUT_MS,
      ...(signal && { signal }),
    }
  );

  const assistant: Message = {
    role: 'assistant',
    content: result.message,
    createdAt: new Date().toISOString(),
    ...(result.metadata ? { turnMetadata: result.metadata } : {}),
    ...(result.speaker
      ? {
        speaker: {
          id: result.speaker.actorId,
          name: result.speaker.name ?? result.speaker.actorId,
        },
      }
      : {}),
  };

  return {
    message: assistant,
    events: result.events,
    stateChanges: result.stateChanges,
  };
}

export async function updateMessage(
  sessionId: string,
  sequence: number,
  content: string,
  signal?: AbortSignal
): Promise<void> {
  await http<void>(`/sessions/${encodeURIComponent(sessionId)}/messages/${sequence}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    ...(signal && { signal }),
  });
}

export async function deleteMessage(
  sessionId: string,
  sequence: number,
  signal?: AbortSignal
): Promise<void> {
  await http<void>(`/sessions/${encodeURIComponent(sessionId)}/messages/${sequence}`, {
    method: 'DELETE',
    ...(signal && { signal }),
  });
}

export async function postSessionHeartbeat(
  sessionId: string,
  signal?: AbortSignal
): Promise<SessionHeartbeatResponse> {
  return http<SessionHeartbeatResponse>(
    `/sessions/${encodeURIComponent(sessionId)}/heartbeat`,
    {
      method: 'POST',
      ...(signal && { signal }),
    }
  );
}

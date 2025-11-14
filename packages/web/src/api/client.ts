import type { CharacterSummary, SettingSummary, Message, Session } from '../types.js'
import { API_BASE_URL } from '../config.js'

function getBaseUrl(): string {
  return (API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '')
}

async function http<T>(path: string, init?: RequestInit & { parseAsText?: boolean }): Promise<T> {
  const base = getBaseUrl()
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  try {
    return (await res.json()) as T
  } catch {
    throw new Error('Failed to parse JSON response')
  }
}

export async function getCharacters(signal?: AbortSignal): Promise<CharacterSummary[]> {
  return http<CharacterSummary[]>('/characters', { signal })
}

export async function getSettings(signal?: AbortSignal): Promise<SettingSummary[]> {
  return http<SettingSummary[]>('/settings', { signal })
}

export async function createSession(characterId: string, settingId: string, signal?: AbortSignal): Promise<Pick<Session, 'id' | 'characterId' | 'settingId' | 'createdAt'>> {
  return http<Pick<Session, 'id' | 'characterId' | 'settingId' | 'createdAt'>>('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, settingId }),
    signal,
  })
}

export async function sendMessage(sessionId: string, content: string, signal?: AbortSignal): Promise<{ message: Message }> {
  return http<{ message: Message }>(`/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    signal,
  })
}

export async function getSession(sessionId: string, signal?: AbortSignal): Promise<Session> {
  return http<Session>(`/sessions/${encodeURIComponent(sessionId)}`, { signal })
}

export const Api = {
  getBaseUrl,
  getCharacters,
  getSettings,
  createSession,
  sendMessage,
  getSession,
}

export default Api

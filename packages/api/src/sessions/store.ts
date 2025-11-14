import type { CharacterProfile, SettingProfile } from '@minimal-rpg/shared'

export type MessageRole = 'user' | 'assistant' | 'system'
export type Message = { role: MessageRole; content: string; createdAt: string }

export type Session = {
  id: string
  characterId: string
  settingId: string
  createdAt: string
  messages: Message[]
}

const sessions = new Map<string, Session>()

export function createSession(id: string, characterId: string, settingId: string) {
  const now = new Date().toISOString()
  const s: Session = { id, characterId, settingId, createdAt: now, messages: [] }
  sessions.set(id, s)
  return s
}

export function getSession(id: string) {
  return sessions.get(id)
}

export function listSessions() {
  return Array.from(sessions.values())
}

export function clearSessions() {
  sessions.clear()
}

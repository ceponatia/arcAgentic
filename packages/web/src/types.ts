export type CharacterSummary = {
  id: string
  name: string
  summary: string
  tags?: string[]
}

export type SettingSummary = {
  id: string
  name: string
  tone: string
}

export type MessageRole = 'user' | 'assistant'

export interface Message {
  role: MessageRole
  content: string
  createdAt: string // ISO timestamp
}

export interface Session {
  id: string
  characterId: string
  settingId: string
  createdAt: string // ISO timestamp
  messages: Message[]
}

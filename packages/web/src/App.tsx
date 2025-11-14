import React, { useState } from 'react'
import { AppHeader } from './components/AppHeader.js'
import { CharactersPanel } from './components/CharactersPanel.js'
import { SettingsSelector } from './components/SettingsSelector.js'
import { SessionsPanel } from './components/SessionsPanel.js'
import { ChatPanel } from './components/ChatPanel.js'
import { createSession } from './api/client.js'
import type { Session } from './types.js'

export const App: React.FC = () => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)
  const [selectedSettingId, setSelectedSettingId] = useState<string | null>(null)
  type SessionSummary = Pick<Session, 'id' | 'characterId' | 'settingId' | 'createdAt'>
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const canStart = !!selectedCharacterId && !!selectedSettingId && !creating

  const onStartSession = async () => {
    if (!selectedCharacterId || !selectedSettingId) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await createSession(selectedCharacterId, selectedSettingId)
      setCurrentSessionId(res.id)
      setSessions((prev) => (prev.some((s) => s.id === res.id) ? prev : [{ ...res }, ...prev]))
    } catch (e) {
      const msg = (e as Error).message || 'Failed to create session'
      setCreateError(msg)
    } finally {
      setCreating(false)
    }
  }
  return (
    <div className="app-root">
      <aside className="sidebar">
        <CharactersPanel selectedId={selectedCharacterId} onSelect={setSelectedCharacterId} />
        <div className="spacer" />
        <SettingsSelector value={selectedSettingId} onChange={setSelectedSettingId} />
        <div className="spacer" />
        <div className="panel">
          <div className="panel-body">
            <button className={`btn primary${!canStart ? ' disabled' : ''}`} disabled={!canStart} onClick={onStartSession}>
              {creating ? 'Starting…' : 'Start Session'}
            </button>
            {createError && <p className="error" style={{ marginTop: 8 }}>{createError}</p>}
            {currentSessionId && <p className="muted" style={{ marginTop: 8 }}>Current session: {currentSessionId}</p>}
          </div>
        </div>
        <div className="spacer" />
        <SessionsPanel sessions={sessions} activeId={currentSessionId} onSelect={setCurrentSessionId} />
      </aside>
      <main className="main">
        {(() => {
          const active = sessions.find((s) => s.id === currentSessionId) || null
          const headerCharacterId = active?.characterId ?? selectedCharacterId
          const headerSettingId = active?.settingId ?? selectedSettingId
          return (
            <AppHeader
              characterId={headerCharacterId}
              settingId={headerSettingId}
              hasSession={!!currentSessionId}
            />
          )
        })()}
        <section className="main-content">
          <ChatPanel sessionId={currentSessionId} />
        </section>
      </main>
    </div>
  )
}

import React from 'react'
import type { Session } from '../types.js'

export interface SessionListItem {
  id: string
  characterId: string
  settingId: string
  createdAt: string
}

export interface SessionsPanelProps {
  sessions: SessionListItem[]
  activeId?: string | null
  onSelect?: (id: string) => void
}

export const SessionsPanel: React.FC<SessionsPanelProps> = ({ sessions, activeId, onSelect }) => {
  const has = sessions.length > 0
  return (
    <section className="panel panel-sessions">
      <h2 className="panel-title">Sessions</h2>
      <div className="panel-body">
        {!has && <p className="muted">No sessions yet.</p>}
        {has && (
          <ul className="list">
            {sessions.map((s) => {
              const isActive = s.id === activeId
              return (
                <li
                  key={s.id}
                  className={`list-item selectable${isActive ? ' selected' : ''}`}
                  onClick={() => onSelect?.(s.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(s.id) }}
                >
                  <div className="item-title">{s.id}</div>
                  <div className="item-summary">{s.characterId} · {s.settingId}</div>
                  <div className="item-tags" style={{ fontSize: '11px' }}>{new Date(s.createdAt).toLocaleTimeString()}</div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

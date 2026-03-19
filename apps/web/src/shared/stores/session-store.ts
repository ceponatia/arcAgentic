import { create } from 'zustand';
import type { StreamStatus } from '../../types.js';

interface SessionState {
  sessionStatus: StreamStatus;
  currentSessionId: string | null;
  turnKey: number;
  currentTick: number;
}

interface SessionActions {
  updateSessionStatus: (status: StreamStatus) => void;
  setSessionId: (id: string | null) => void;
  incrementTick: () => void;
  setTick: (tick: number) => void;
  bumpTurnKey: () => void;
}

export type SessionStore = SessionState & SessionActions;

export const useSessionStore = create<SessionStore>((set) => ({
  sessionStatus: 'disconnected',
  currentSessionId: null,
  turnKey: 0,
  currentTick: 0,
  updateSessionStatus: (status) => set({ sessionStatus: status }),
  setSessionId: (id) => set({ currentSessionId: id }),
  incrementTick: () => set((s) => ({ currentTick: s.currentTick + 1 })),
  setTick: (tick) => set({ currentTick: tick }),
  bumpTurnKey: () => set((s) => ({ turnKey: s.turnKey + 1 })),
}));

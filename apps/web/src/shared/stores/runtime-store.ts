import { create } from 'zustand';
import type { ActorDebugState, StreamEvent } from '../../types.js';

interface RuntimeState {
  actorStates: Record<string, ActorDebugState>;
  activeActorIds: string[];
  eventLog: StreamEvent[];
  lastEvent: StreamEvent | null;
  selectedActorId: string | null;
  overlayOpen: boolean;
}

interface RuntimeActions {
  updateActorState: (id: string, patch: Partial<ActorDebugState>) => void;
  resetActors: () => void;
  addEvent: (event: StreamEvent) => void;
  clearEvents: () => void;
  setSelectedActorId: (id: string | null) => void;
  toggleOverlay: () => void;
}

export type RuntimeStore = RuntimeState & RuntimeActions;

export const useRuntimeStore = create<RuntimeStore>((set) => ({
  actorStates: {},
  activeActorIds: [],
  eventLog: [],
  lastEvent: null,
  selectedActorId: null,
  overlayOpen: false,
  updateActorState: (id, patch) =>
    set((s) => {
      const actorStates = new Map<string, ActorDebugState>(Object.entries(s.actorStates));
      const existingState = actorStates.get(id);
      actorStates.set(id, { ...existingState, ...patch });

      return {
        actorStates: Object.fromEntries(actorStates) as Record<string, ActorDebugState>,
        activeActorIds: s.activeActorIds.includes(id) ? s.activeActorIds : [...s.activeActorIds, id],
      };
    }),
  resetActors: () => set({ actorStates: {}, activeActorIds: [] }),
  addEvent: (event) =>
    set((s) => {
      const newLog = [...s.eventLog, event];
      return { eventLog: newLog.length > 100 ? newLog.slice(-100) : newLog, lastEvent: event };
    }),
  clearEvents: () => set({ eventLog: [], lastEvent: null }),
  setSelectedActorId: (id) => set({ selectedActorId: id }),
  toggleOverlay: () => set((s) => ({ overlayOpen: !s.overlayOpen })),
}));

import { API_BASE_URL } from '../../config.js';
import {
  createWorkspaceDraft,
  updateWorkspaceDraft,
  deleteWorkspaceDraft as apiDeleteWorkspaceDraft,
  setWorkspaceModePreference,
  getWorkspaceModePreference,
} from '../../shared/api/client.js';
import type { WorkspaceStore } from './types.js';

type SetState = (
  partial: Partial<WorkspaceStore> | ((state: WorkspaceStore) => Partial<WorkspaceStore>),
  replace?: false,
  action?: string,
) => void;

type GetState = () => WorkspaceStore;

interface SyncableStore {
  getState: () => WorkspaceStore;
  setState: (
    partial: Partial<WorkspaceStore> | ((state: WorkspaceStore) => Partial<WorkspaceStore>),
    replace?: false,
    action?: string
  ) => void;
  subscribe: <T>(
    selector: (state: WorkspaceStore) => T,
    listener: (value: T) => void
  ) => () => void;
}

/** Debounce interval for server sync (60 seconds as per spec) */
const SYNC_DEBOUNCE_MS = 60_000;

/** Minimum time between syncs */
const MIN_SYNC_INTERVAL_MS = 5_000;

/** Track debounce timer globally */
let syncTimeoutId: ReturnType<typeof setTimeout> | null = null;
let lastSyncTime = 0;

function scheduleDebouncedSync(getState: () => WorkspaceStore): void {
  if (syncTimeoutId) {
    clearTimeout(syncTimeoutId);
  }

  syncTimeoutId = setTimeout(() => {
    const state = getState();
    if (state.isDirty && !state.isSaving) {
      void state.saveDraftToServer();
    }
    syncTimeoutId = null;
  }, SYNC_DEBOUNCE_MS);
}

function triggerImmediateSync(getState: () => WorkspaceStore): void {
  const now = Date.now();
  if (now - lastSyncTime < MIN_SYNC_INTERVAL_MS) {
    return;
  }

  const state = getState();
  if (state.isDirty && !state.isSaving) {
    lastSyncTime = now;
    void state.saveDraftToServer();
  }
}

export function setupServerSync(store: SyncableStore): void {
  // Subscribe to isDirty changes
  store.subscribe(
    (state: WorkspaceStore) => state.isDirty,
    (isDirty: boolean) => {
      if (isDirty) {
        scheduleDebouncedSync(store.getState);
      }
    }
  );

  // Sync on step changes (more aggressive)
  store.subscribe(
    (state: WorkspaceStore) => state.currentStep,
    () => {
      triggerImmediateSync(store.getState);
    }
  );

  // Sync on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      const state = store.getState();
      if (state.isDirty && state.draftId) {
        const workspaceState: Record<string, unknown> = {
          setting: state.setting,
          locations: state.locations,
          npcs: state.npcs,
          player: state.player,
          tags: state.tags,
          relationships: state.relationships,
          completedSteps: Array.from(state.completedSteps),
          mode: state.mode,
        };

        const payload = JSON.stringify({
          workspaceState,
          currentStep: state.currentStep,
        });

        const url = new URL(`/workspace-drafts/${state.draftId}`, API_BASE_URL).toString();
        const success = navigator.sendBeacon(
          url,
          new Blob([payload], { type: 'application/json' })
        );

        if (!success) {
          console.warn('[Workspace] sendBeacon failed, data may be lost');
        }
      }
    });
  }
}

export async function loadModePreference(store: SyncableStore): Promise<void> {
  try {
    const mode = await getWorkspaceModePreference();
    const currentMode = store.getState().mode;
    if (mode !== currentMode) {
      store.setState({ mode }, false, 'loadModePreference');
      console.info('[Workspace] Loaded mode preference from server:', mode);
    }
  } catch (err) {
    console.warn('[Workspace] Failed to load mode preference:', err);
  }
}

/** Factory for persistence-related store actions (saveDraftToServer, deleteDraftFromServer, setMode). */
export function createPersistenceActions(
  set: SetState,
  get: GetState,
): Pick<WorkspaceStore, 'saveDraftToServer' | 'deleteDraftFromServer' | 'setMode'> {
  return {
    saveDraftToServer: async () => {
      const state = get();
      if (state.isSaving) return;

      set({ isSaving: true }, false, 'saveDraftToServer:start');

      try {
        const workspaceState: Record<string, unknown> = {
          setting: state.setting,
          locations: state.locations,
          npcs: state.npcs,
          player: state.player,
          tags: state.tags,
          relationships: state.relationships,
          completedSteps: Array.from(state.completedSteps),
          mode: state.mode,
        };

        if (state.draftId) {
          await updateWorkspaceDraft(state.draftId, {
            workspaceState,
            currentStep: state.currentStep,
          });
          console.info('[Workspace] Draft updated:', state.draftId);
        } else {
          const draft = await createWorkspaceDraft({
            workspaceState,
            currentStep: state.currentStep,
          });
          set({ draftId: draft.id }, false, 'saveDraftToServer:created');
          console.info('[Workspace] Draft created:', draft.id);
        }

        set({ isDirty: false, lastSavedAt: Date.now() }, false, 'saveDraftToServer:done');
      } catch (err) {
        console.error('[Workspace] Failed to save draft to server:', err);
      } finally {
        set({ isSaving: false }, false, 'saveDraftToServer:end');
      }
    },

    deleteDraftFromServer: async () => {
      const state = get();
      if (!state.draftId) return;

      try {
        await apiDeleteWorkspaceDraft(state.draftId);
        console.info('[Workspace] Draft deleted:', state.draftId);
        set({ draftId: null }, false, 'deleteDraftFromServer');
      } catch (err) {
        console.error('[Workspace] Failed to delete draft:', err);
      }
    },

    setMode: (mode) => {
      set({ mode }, false, 'setMode');
      void setWorkspaceModePreference(mode).catch((err: unknown) => {
        console.warn('[Workspace] Failed to persist mode preference:', err);
      });
    },
  };
}

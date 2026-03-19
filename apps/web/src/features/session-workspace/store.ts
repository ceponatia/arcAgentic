/**
 * Session Workspace Zustand Store
 *
 * Manages state for the multi-step session creation workflow.
 * Supports:
 * - Non-linear step navigation
 * - Auto-save to localStorage + server sync
 * - Per-step validation
 * - Draft persistence
 */

import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import { setupServerSync, loadModePreference, createPersistenceActions } from './sync.js';
import { createValidationActions } from './validation.js';
import type {
  WorkspaceStep,
  WorkspaceState,
  WorkspaceStore,
} from './types.js';

// Re-export all types for backward compatibility
export type {
  WorkspaceStep,
  SettingWorkspaceState,
  LocationMapState,
  NpcRole,
  SessionNpcTier,
  NpcSessionConfig,
  PlayerSessionConfig,
  TagSelection,
  RelationshipConfig,
  StepValidationState,
  WorkspaceValidationSummary,
  WorkspaceState,
  WorkspaceActions,
  WorkspaceStore,
} from './types.js';

// ============================================================================
// Initial State
// ============================================================================

const initialState: WorkspaceState = {
  currentStep: 'setting',
  completedSteps: new Set<WorkspaceStep>(),
  setting: {
    settingId: null,
    settingProfile: null,
  },
  locations: {
    mapId: null,
    startLocationId: null,
  },
  npcs: [],
  player: {
    personaId: null,
  },
  tags: [],
  relationships: [],
  draftId: null,
  isDirty: false,
  lastSavedAt: null,
  isSaving: false,
  mode: 'wizard',
};

// ============================================================================
// Store Creation
// ============================================================================

export const useWorkspaceStore = create<WorkspaceStore>()(
  subscribeWithSelector(
    devtools(
      persist(
        (set, get) => ({
          ...initialState,

          // Navigation
          setStep: (step) => set({ currentStep: step }, false, 'setStep'),
          markStepComplete: (step) =>
            set(
              (state) => ({
                completedSteps: new Set([...state.completedSteps, step]),
              }),
              false,
              'markStepComplete'
            ),

          // Setting
          updateSetting: (partial) =>
            set(
              (state) => ({
                setting: { ...state.setting, ...partial },
                isDirty: true,
              }),
              false,
              'updateSetting'
            ),
          selectSetting: (settingId, profile) =>
            set(
              (state) => ({
                setting: { ...state.setting, settingId, settingProfile: profile },
                isDirty: true,
              }),
              false,
              'selectSetting'
            ),
          clearSetting: () =>
            set(
              () => ({
                setting: { settingId: null, settingProfile: null },
                isDirty: true,
              }),
              false,
              'clearSetting'
            ),

          // Locations
          updateLocations: (partial) =>
            set(
              (state) => ({
                locations: { ...state.locations, ...partial },
                isDirty: true,
              }),
              false,
              'updateLocations'
            ),
          setLocations: (locations) =>
            set(
              () => ({
                locations: locations ?? { mapId: null, startLocationId: null },
                isDirty: true,
              }),
              false,
              'setLocations'
            ),

          // NPCs
          addNpc: (npc) =>
            set(
              (state) => ({
                npcs: [...state.npcs, npc],
                isDirty: true,
              }),
              false,
              'addNpc'
            ),
          updateNpc: (characterId, partial) =>
            set(
              (state) => ({
                npcs: state.npcs.map((n) =>
                  n.characterId === characterId ? { ...n, ...partial } : n
                ),
                isDirty: true,
              }),
              false,
              'updateNpc'
            ),
          removeNpc: (characterId) =>
            set(
              (state) => ({
                npcs: state.npcs.filter((n) => n.characterId !== characterId),
                isDirty: true,
              }),
              false,
              'removeNpc'
            ),
          clearNpcs: () => set(() => ({ npcs: [], isDirty: true }), false, 'clearNpcs'),

          // Player
          updatePlayer: (partial) =>
            set(
              (state) => ({
                player: { ...state.player, ...partial },
                isDirty: true,
              }),
              false,
              'updatePlayer'
            ),
          selectPersona: (personaId, profile) =>
            set(
              (state) => ({
                player: { ...state.player, personaId, personaProfile: profile },
                isDirty: true,
              }),
              false,
              'selectPersona'
            ),
          clearPersona: () =>
            set(
              (state) => {
                const startLocationId = state.player.startLocationId;
                return {
                  player: {
                    personaId: null,
                    ...(startLocationId ? { startLocationId } : {}),
                  },
                  isDirty: true,
                };
              },
              false,
              'clearPersona'
            ),

          // Tags
          addTag: (tag) =>
            set(
              (state) => ({
                tags: [...state.tags, tag],
                isDirty: true,
              }),
              false,
              'addTag'
            ),
          updateTag: (tagId, partial) =>
            set(
              (state) => ({
                tags: state.tags.map((t) => (t.tagId === tagId ? { ...t, ...partial } : t)),
                isDirty: true,
              }),
              false,
              'updateTag'
            ),
          removeTag: (tagId) =>
            set(
              (state) => ({
                tags: state.tags.filter((t) => t.tagId !== tagId),
                isDirty: true,
              }),
              false,
              'removeTag'
            ),
          clearTags: () => set(() => ({ tags: [], isDirty: true }), false, 'clearTags'),

          // Relationships
          addRelationship: (rel) =>
            set(
              (state) => ({
                relationships: [...state.relationships, rel],
                isDirty: true,
              }),
              false,
              'addRelationship'
            ),
          updateRelationship: (fromActorId, toActorId, partial) =>
            set(
              (state) => ({
                relationships: state.relationships.map((r) =>
                  r.fromActorId === fromActorId && r.toActorId === toActorId
                    ? { ...r, ...partial }
                    : r
                ),
                isDirty: true,
              }),
              false,
              'updateRelationship'
            ),
          removeRelationship: (fromActorId, toActorId) =>
            set(
              (state) => ({
                relationships: state.relationships.filter(
                  (r) => !(r.fromActorId === fromActorId && r.toActorId === toActorId)
                ),
                isDirty: true,
              }),
              false,
              'removeRelationship'
            ),

          // Persistence
          setDraftId: (id) => set({ draftId: id }, false, 'setDraftId'),
          markDirty: () => set({ isDirty: true }, false, 'markDirty'),
          markSaved: () => set({ isDirty: false, lastSavedAt: Date.now() }, false, 'markSaved'),
          setIsSaving: (saving) => set({ isSaving: saving }, false, 'setIsSaving'),
          ...createPersistenceActions(set, get),

          // Validation
          ...createValidationActions(get),

          // Reset
          reset: () => set({ ...initialState, completedSteps: new Set() }, false, 'reset'),
          loadFromDraft: (draft) =>
            set(
              (state) => ({
                ...state,
                ...draft,
                completedSteps: draft.completedSteps
                  ? new Set(draft.completedSteps)
                  : state.completedSteps,
                isDirty: false,
              }),
              false,
              'loadFromDraft'
            ),
        }),
        {
          name: 'session-workspace',
          // Only persist essential state, not UI state
          partialize: (state) => ({
            setting: state.setting,
            locations: state.locations,
            npcs: state.npcs,
            player: state.player,
            tags: state.tags,
            relationships: state.relationships,
            draftId: state.draftId,
            currentStep: state.currentStep,
            mode: state.mode,
            completedSteps: Array.from(state.completedSteps),
          }),
          // Custom merge to handle Set conversion
          merge: (persistedState, currentState) => ({
            ...currentState,
            ...(persistedState as Partial<WorkspaceState>),
            completedSteps: new Set(
              (persistedState as { completedSteps?: WorkspaceStep[] }).completedSteps ?? []
            ),
          }),
        }
      ),
      { name: 'SessionWorkspace' }
    )
  )
);

// Initialize server sync on module load
setupServerSync(useWorkspaceStore);

// Load mode preference on module init (after a small delay to not block initial render)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    void loadModePreference(useWorkspaceStore);
  }, 100);
}

// Re-export selector hooks for backward compatibility
export {
  useCurrentStep,
  useSettingState,
  useNpcsState,
  usePlayerState,
  useTagsState,
  useWorkspaceMode,
  useIsDirty,
  useValidation,
  useSaveStatus,
} from './hooks.js';

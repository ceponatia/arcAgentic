import { useMemo } from 'react';
import { useWorkspaceStore } from './store.js';
import type {
  NpcSessionConfig,
  WorkspaceValidationSummary,
} from './types.js';

export const useCurrentStep = () => useWorkspaceStore((s) => s.currentStep);
export const useSettingState = () => useWorkspaceStore((s) => s.setting);
export const useNpcsState = (): NpcSessionConfig[] => useWorkspaceStore((s) => s.npcs);
export const usePlayerState = () => useWorkspaceStore((s) => s.player);
export const useTagsState = () => useWorkspaceStore((s) => s.tags);
export const useWorkspaceMode = () => useWorkspaceStore((s) => s.mode);
export const useIsDirty = () => useWorkspaceStore((s) => s.isDirty);

export const useValidation = (): WorkspaceValidationSummary => {
  const setting = useWorkspaceStore((s) => s.setting);
  const npcs = useWorkspaceStore((s) => s.npcs);
  const player = useWorkspaceStore((s) => s.player);
  const tags = useWorkspaceStore((s) => s.tags);
  const locations = useWorkspaceStore((s) => s.locations);
  const relationships = useWorkspaceStore((s) => s.relationships);
  const validate = useWorkspaceStore((s) => s.validate);

  // Memoize validation result to avoid infinite re-renders
  return useMemo(() => {
    const validationState = { setting, npcs, player, tags, locations, relationships };
    void validationState;
    return validate();
  }, [locations, npcs, player, relationships, setting, tags, validate]);
};

export const useSaveStatus = () => {
  const isDirty = useWorkspaceStore((s) => s.isDirty);
  const isSaving = useWorkspaceStore((s) => s.isSaving);
  const lastSavedAt = useWorkspaceStore((s) => s.lastSavedAt);
  const draftId = useWorkspaceStore((s) => s.draftId);
  const saveDraftToServer = useWorkspaceStore((s) => s.saveDraftToServer);
  const deleteDraftFromServer = useWorkspaceStore((s) => s.deleteDraftFromServer);

  return {
    isDirty,
    isSaving,
    lastSavedAt,
    hasDraft: !!draftId,
    save: saveDraftToServer,
    deleteDraft: deleteDraftFromServer,
  };
};

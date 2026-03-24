import { describe, expect, it } from 'vitest';
import type { CharacterProfile, SettingProfile } from '@arcagentic/schemas';
import type { WorkspaceState, WorkspaceStore } from './types.js';
import {
  createValidationActions,
  validateLocationsStep,
  validateNpcsStep,
  validatePlayerStep,
  validateReviewStep,
  validateSettingStep,
  validateTagsStep,
} from './validation.js';

function createValidWorkspaceState(): WorkspaceState {
  return {
    currentStep: 'setting',
    completedSteps: new Set(),
    setting: {
      settingId: 'setting-1',
      settingProfile: {} as SettingProfile,
    },
    locations: {
      mapId: 'map-1',
      startLocationId: 'location-1',
    },
    npcs: [
      {
        characterId: 'npc-1',
        characterProfile: {} as CharacterProfile,
        role: 'primary',
        tier: 'major',
      },
    ],
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
}

function createValidationHarness(state: WorkspaceState) {
  const store = state as WorkspaceStore;
  const actions = createValidationActions(() => store);
  Object.assign(store, actions);
  return actions;
}

describe('session workspace validation', () => {
  it('accepts a valid workspace state', () => {
    const state = createValidWorkspaceState();

    expect(validateSettingStep(state)).toEqual({ valid: true, errors: [] });
    expect(validateNpcsStep(state)).toEqual({ valid: true, errors: [] });
    expect(validateReviewStep(state)).toEqual({ valid: true, errors: [] });
  });

  it('fails validation when the setting is missing', () => {
    const state = createValidWorkspaceState();
    state.setting.settingId = null;

    expect(validateSettingStep(state)).toEqual({
      valid: false,
      errors: ['Please select a setting'],
    });
  });

  it('treats missing locations as valid because locations are optional in MVP', () => {
    expect(validateLocationsStep()).toEqual({ valid: true, errors: [] });
  });

  it('treats a missing player persona as valid because the player step is optional', () => {
    expect(validatePlayerStep()).toEqual({ valid: true, errors: [] });
  });

  it('enforces edge-case tag rules for character and location targets', () => {
    const noNpcState = createValidWorkspaceState();
    noNpcState.npcs = [];
    noNpcState.tags = [{ tagId: 'tag-1', tagName: 'Wanted', targetType: 'character' }];

    expect(validateTagsStep(noNpcState)).toEqual({
      valid: false,
      errors: ['Tag "Wanted" targets characters but no NPCs are in the session'],
    });

    const noMapState = createValidWorkspaceState();
    noMapState.locations = { mapId: null, startLocationId: null };
    noMapState.tags = [{ tagId: 'tag-2', tagName: 'Cursed', targetType: 'location' }];

    expect(validateTagsStep(noMapState)).toEqual({
      valid: false,
      errors: ['Tag "Cursed" targets locations but no location map is selected'],
    });
  });

  it('validate aggregates step results and gates overall validity on required steps', () => {
    const state = createValidWorkspaceState();
    state.npcs = [];

    const actions = createValidationHarness(state);
    const result = actions.validate();

    expect(result.valid).toBe(false);
    expect(result.stepErrors.setting).toEqual({ valid: true, errors: [] });
    expect(result.stepErrors.npcs).toEqual({
      valid: false,
      errors: ['Please add at least one NPC to the session'],
    });
    expect(result.stepErrors.locations).toEqual({ valid: true, errors: [] });
    expect(result.stepErrors.player).toEqual({ valid: true, errors: [] });
  });
});

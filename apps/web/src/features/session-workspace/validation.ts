import type {
  StepValidationState,
  WorkspaceStep,
  WorkspaceState,
  WorkspaceStore,
} from './types.js';

export function validateSettingStep(state: WorkspaceState): StepValidationState {
  const errors: string[] = [];
  if (!state.setting.settingId) {
    errors.push('Please select a setting');
  }
  return { valid: errors.length === 0, errors };
}

export function validateLocationsStep(): StepValidationState {
  // Locations are optional in MVP
  return { valid: true, errors: [] };
}

export function validateNpcsStep(state: WorkspaceState): StepValidationState {
  const errors: string[] = [];
  if (state.npcs.length === 0) {
    errors.push('Please add at least one NPC to the session');
  }
  return { valid: errors.length === 0, errors };
}

export function validatePlayerStep(): StepValidationState {
  // Player/Persona is optional
  return { valid: true, errors: [] };
}

export function validateTagsStep(state: WorkspaceState): StepValidationState {
  // Tags are optional, but any selected targeted tags must be fully configured.
  const errors: string[] = [];

  for (const tag of state.tags) {
    const tagName = tag.tagName ?? tag.tagId;

    if (tag.targetType === 'character') {
      if (state.npcs.length === 0) {
        errors.push(`Tag "${tagName}" targets characters but no NPCs are in the session`);
        continue;
      }
      if (!tag.targetEntityIds || tag.targetEntityIds.length === 0) {
        errors.push(`Select one or more characters for tag "${tagName}"`);
      }
    }

    if (tag.targetType === 'location') {
      if (!state.locations.mapId) {
        errors.push(`Tag "${tagName}" targets locations but no location map is selected`);
        continue;
      }
      if (!tag.targetEntityIds || tag.targetEntityIds.length === 0) {
        errors.push(`Select one or more locations for tag "${tagName}"`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateRelationshipsStep(): StepValidationState {
  // Relationships are optional - players can configure them or leave as defaults
  return { valid: true, errors: [] };
}

export function validateReviewStep(state: WorkspaceState): StepValidationState {
  // Review step is valid if setting and NPCs are valid
  const settingValid = validateSettingStep(state);
  const npcsValid = validateNpcsStep(state);

  const errors: string[] = [];
  if (!settingValid.valid) {
    errors.push('Setting step is incomplete');
  }
  if (!npcsValid.valid) {
    errors.push('NPCs step is incomplete');
  }

  return { valid: errors.length === 0, errors };
}

/** Factory for validation-related store actions (validateStep, validate). */
export function createValidationActions(
  get: () => WorkspaceStore,
): Pick<WorkspaceStore, 'validateStep' | 'validate'> {
  return {
    validateStep: (step) => {
      const state = get();
      switch (step) {
        case 'setting':
          return validateSettingStep(state);
        case 'locations':
          return validateLocationsStep();
        case 'npcs':
          return validateNpcsStep(state);
        case 'player':
          return validatePlayerStep();
        case 'tags':
          return validateTagsStep(state);
        case 'relationships':
          return validateRelationshipsStep();
        case 'review':
          return validateReviewStep(state);
        default:
          return { valid: true, errors: [] };
      }
    },

    validate: () => {
      const steps: WorkspaceStep[] = [
        'setting',
        'locations',
        'npcs',
        'player',
        'tags',
        'relationships',
        'review',
      ];
      const stepErrors: Partial<Record<WorkspaceStep, StepValidationState>> = {};
      let valid = true;

      for (const step of steps) {
        const validation = get().validateStep(step);
        Object.defineProperty(stepErrors, step, {
          value: validation,
          writable: true,
          enumerable: true,
          configurable: true,
        });
        if (!validation.valid && (step === 'setting' || step === 'npcs')) {
          valid = false;
        }
      }

      return { valid, stepErrors };
    },
  };
}

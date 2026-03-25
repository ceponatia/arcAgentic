export type {
  PersonaBodySensoryEntry,
  PersonaAppearanceEntry,
  PersonaFormState,
  PersonaFormKey,
  PersonaFormFieldErrors,
  PersonaUpdateFieldFn,
} from '@arcagentic/schemas';

import {
  BODY_REGIONS,
  APPEARANCE_REGIONS,
  type PersonaBodySensoryEntry,
  type PersonaAppearanceEntry,
  type PersonaFormState,
} from '@arcagentic/schemas';
import { generateId } from '@arcagentic/utils';

export const createBodySensoryEntry = (): PersonaBodySensoryEntry => ({
  region: BODY_REGIONS[0],
  type: 'scent',
  raw: '',
});

export const createAppearanceEntry = (): PersonaAppearanceEntry => ({
  region: APPEARANCE_REGIONS[0],
  attribute: 'height',
  value: '',
});

export const createInitialState = (): PersonaFormState => ({
  id: generateId(),
  name: '',
  age: 21,
  gender: '',
  summary: '',
  appearance: '',
  appearances: [createAppearanceEntry()],
  bodySensory: [createBodySensoryEntry()],
});

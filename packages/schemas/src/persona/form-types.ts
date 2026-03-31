import type { BodyRegion, AppearanceRegion, FormSensoryType } from '../index.js';

/**
 * Form entry for body sensory data.
 * Supports raw text input that gets parsed to structured BodyMap.
 */
export interface PersonaBodySensoryEntry {
  /** Body region (hair, torso, feet, etc.) */
  region: BodyRegion;
  /** Sensory type: scent, texture, or flavor (visual is covered by appearance section) */
  type: FormSensoryType;
  /** Raw text description (parsed on save) */
  raw: string;
}

/**
 * Form entry for appearance data.
 * Each entry specifies a region, attribute, and value.
 */
export interface PersonaAppearanceEntry {
  /** Appearance region (hair, eyes, arms, etc.) */
  region: AppearanceRegion;
  /** Attribute key for the region (e.g., 'color' for hair) */
  attribute: string;
  /** Value for the attribute */
  value: string;
}

/**
 * Complete form state for the persona builder.
 */
export interface PersonaFormState {
  id: string;
  name: string;
  age: number | string;
  gender: string;
  summary: string;
  /** Free-text appearance (alternative to structured entries) */
  appearance: string;
  /** Structured appearance entries (region -> attribute -> value) */
  appearances: PersonaAppearanceEntry[];
  /** Selected appeal tag IDs for NPC feature preferences */
  appealTags: string[];
  /** Body sensory entries (scent, texture, visual per region) */
  bodySensory: PersonaBodySensoryEntry[];
}

/** Union of all form field names. */
export type PersonaFormKey = keyof PersonaFormState;

/** Partial record mapping form field names to error strings. */
export type PersonaFormFieldErrors = Partial<Record<PersonaFormKey, string>>;

/** Generic field updater function type for the persona form. */
export type PersonaUpdateFieldFn = <K extends keyof PersonaFormState>(
  key: K,
  value: PersonaFormState[K],
) => void;

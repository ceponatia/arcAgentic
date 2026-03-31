import { MAX_PERSONA_APPEAL_TAGS } from './appeal-tag-data.js';
import type { PersonaFormState, PersonaFormFieldErrors } from './form-types.js';

/**
 * Validate persona form state before save.
 * Returns an object with field-level error messages.
 * An empty object means validation passed.
 */
export function validatePersonaBeforeSave(
  form: PersonaFormState,
): PersonaFormFieldErrors {
  const errors: PersonaFormFieldErrors = {};

  if (!form.name.trim()) {
    errors.name = 'Name is required';
  }

  if (!form.summary.trim()) {
    errors.summary = 'Summary is required';
  } else if (form.summary.trim().length > 500) {
    errors.summary = 'Summary must be 500 characters or fewer';
  }

  if (form.appealTags?.length > MAX_PERSONA_APPEAL_TAGS) {
    errors.appealTags = `Maximum of ${MAX_PERSONA_APPEAL_TAGS} appeal tags allowed`;
  }

  return errors;
}

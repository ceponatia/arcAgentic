import {
  BODY_REGIONS,
  AppealTagDefinitionSchema,
  AppealTagIdSchema,
  BUILT_IN_APPEAL_TAGS,
  BUILT_IN_APPEAL_TAG_IDS,
  MAX_PERSONA_APPEAL_TAGS,
  PersonaProfileSchema,
  validatePersonaBeforeSave,
} from '@arcagentic/schemas';

const BASE_PERSONA = {
  id: 'persona-test-001',
  name: 'Test Persona',
  summary: 'A persona used to verify appeal tag contracts.',
};

describe('Appeal tag definitions', () => {
  it('parses all built-in appeal tags', () => {
    BUILT_IN_APPEAL_TAGS.forEach((tag) => {
      expect(AppealTagDefinitionSchema.parse(tag)).toEqual(tag);
    });
  });

  it('uses only canonical body region values on built-in tags', () => {
    const validRegions = new Set<string>(BODY_REGIONS);

    BUILT_IN_APPEAL_TAGS.forEach((tag) => {
      tag.bodyRegions.forEach((region) => {
        expect(validRegions.has(region)).toBe(true);
      });
    });
  });

  it('accepts valid built-in appeal tag IDs and rejects unknown ones', () => {
    BUILT_IN_APPEAL_TAG_IDS.forEach((id) => {
      expect(AppealTagIdSchema.safeParse(id).success).toBe(true);
    });

    expect(AppealTagIdSchema.safeParse('unknown-tag').success).toBe(false);
  });
});

describe('PersonaProfileSchema appeal tags', () => {
  it('accepts personas without appealTags for backward compatibility', () => {
    expect(PersonaProfileSchema.parse(BASE_PERSONA)).toEqual(BASE_PERSONA);
  });

  it('accepts personas with valid appealTags', () => {
    const persona = {
      ...BASE_PERSONA,
      appealTags: ['hair', 'voice'],
    };

    expect(PersonaProfileSchema.parse(persona)).toEqual(persona);
  });

  it('rejects personas with unknown appeal tag IDs', () => {
    const result = PersonaProfileSchema.safeParse({
      ...BASE_PERSONA,
      appealTags: ['hair', 'not-real'],
    });

    expect(result.success).toBe(false);
  });

  it('rejects personas with more than the maximum number of appeal tags', () => {
    const result = PersonaProfileSchema.safeParse({
      ...BASE_PERSONA,
      appealTags: BUILT_IN_APPEAL_TAG_IDS.slice(0, MAX_PERSONA_APPEAL_TAGS + 1),
    });

    expect(result.success).toBe(false);
  });

  it('round-trips serialized persona profiles with appealTags', () => {
    const persona = PersonaProfileSchema.parse({
      ...BASE_PERSONA,
      appealTags: ['hair', 'neck', 'warmth'],
    });

    const serialized = JSON.stringify(persona);
    const reparsed = PersonaProfileSchema.parse(JSON.parse(serialized));

    expect(reparsed).toEqual(persona);
  });
});

describe('validatePersonaBeforeSave', () => {
  it('returns an error when too many appeal tags are selected', () => {
    const errors = validatePersonaBeforeSave({
      id: 'persona-form-001',
      name: 'Form Persona',
      age: '',
      gender: 'female',
      summary: 'Valid summary',
      appearance: '',
      appearances: [],
      appealTags: BUILT_IN_APPEAL_TAG_IDS.slice(0, MAX_PERSONA_APPEAL_TAGS + 1),
      bodySensory: [],
    });

    expect(errors.appealTags).toBe(`Maximum of ${MAX_PERSONA_APPEAL_TAGS} appeal tags allowed`);
  });
});
import { CharacterProfileSchema, RACES } from '@arcagentic/schemas';
import {
  BASE_THEME,
  MODERN_MAN_THEME,
  MODERN_WOMAN_THEME,
  generateCharacter,
} from '../../src/character/index.js';
import type { CharacterTheme } from '../../src/character/types.js';
import type { ValuePool, WeightedValue } from '../../src/types.js';

type PoolEntry<T> = T | WeightedValue<T>;

function singleValuePool<T>(pool: ValuePool<T>): readonly [T] {
  const first = pool[0] as PoolEntry<T> | undefined;

  if (first === undefined) {
    throw new Error('Expected pool to contain at least one value');
  }

  if (typeof first === 'object' && first !== null && 'value' in first) {
    return [first.value] as const;
  }

  return [first] as const;
}

const TEST_THEME: CharacterTheme = {
  id: 'test-theme',
  name: 'Test Theme',
  description: 'A deterministic test theme.',
  defaultGender: 'female',
  basics: {
    firstNames: ['Taylor'],
    lastNames: ['Stone'],
    races: singleValuePool(RACES),
    ageRange: [30, 30],
    summaryTemplates: ['{name} is a {age}-year-old with a {trait1} outlook.'],
    backstoryTemplates: [
      '{name} grew up in {hometown}, loved {interest}, and changed after {event} with {relationship}.',
    ],
    personalityTraits: ['calm', 'kind', 'curious', 'observant'],
  },
  appearance: {
    heights: ['average'],
    builds: ['athletic'],
    skinTones: ['medium'],
    hairColors: ['brown'],
    hairStyles: ['wavy'],
    hairLengths: ['medium'],
    eyeColors: ['green'],
    faceFeatures: ['freckles'],
    armBuilds: ['average'],
    legBuilds: ['average'],
    footSizes: ['average'],
  },
  personality: {
    traits: ['calm', 'kind', 'curious', 'observant'],
    dimensionBiases: {
      openness: [0.4, 0.4],
      conscientiousness: [0.5, 0.5],
      extraversion: [0.3, 0.3],
      agreeableness: [0.6, 0.6],
      neuroticism: [0.2, 0.2],
    },
    values: singleValuePool(BASE_THEME.personality.values),
    fearCategories: singleValuePool(BASE_THEME.personality.fearCategories),
    fearDescriptions: ['being rejected'],
    fearTriggers: ['crowds'],
    copingMechanisms: singleValuePool(BASE_THEME.personality.copingMechanisms),
    attachmentStyles: singleValuePool(BASE_THEME.personality.attachmentStyles),
    moodBaselines: singleValuePool(BASE_THEME.personality.moodBaselines),
    currentEmotions: singleValuePool(BASE_THEME.personality.currentEmotions),
    emotionIntensities: singleValuePool(BASE_THEME.personality.emotionIntensities),
    soothingActivities: ['journaling'],
    stressIndicators: ['fidgeting'],
  },
  body: {
    general: {
      scentPrimaries: ['clean'],
      texturePrimaries: ['soft'],
      flavorPrimaries: ['clean'],
    },
    regionsToPopulate: ['hair', 'mouth', 'leftBreast', 'penis'],
    regionPopulationRate: 1,
  },
  details: {
    labels: {
      preference: ['favorite color'],
    },
    values: {
      preference: ['blue'],
    },
    countRange: [2, 2],
    focusAreas: ['preference'],
  },
  defaultTags: ['generated', 'test-theme'],
};

describe('generateCharacter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a result with character and meta fields', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = generateCharacter({ theme: TEST_THEME });

    expect(result).toHaveProperty('character');
    expect(result).toHaveProperty('meta');
  });

  it('sets meta.themeId to the theme id', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(generateCharacter({ theme: TEST_THEME }).meta.themeId).toBe(TEST_THEME.id);
  });

  it('tracks generated top-level fields in meta.generatedFields', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = generateCharacter({ theme: TEST_THEME });

    expect(result.meta.generatedFields).toEqual(
      expect.arrayContaining(['gender', 'name', 'age', 'physique', 'body', 'personalityMap'])
    );
  });

  it('creates required top-level character fields', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const { character } = generateCharacter({ theme: TEST_THEME });

    expect(character.id).toMatch(/^char-/);
    expect(character.name.length).toBeGreaterThan(0);
    expect(typeof character.age).toBe('number');
    expect(character.gender).toBe('female');
  });

  it('produces schema-valid output', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = generateCharacter({ theme: TEST_THEME });

    expect(() => CharacterProfileSchema.parse(result.character)).not.toThrow();
  });

  it('uses the theme default gender when one is defined', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.75);

    expect(generateCharacter({ theme: TEST_THEME }).character.gender).toBe('female');
  });

  it('keeps age within the theme age range', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);

    const { age } = generateCharacter({ theme: BASE_THEME }).character;

    expect(age).toBeGreaterThanOrEqual(BASE_THEME.basics.ageRange[0]);
    expect(age).toBeLessThanOrEqual(BASE_THEME.basics.ageRange[1]);
  });

  it('draws the generated name from the theme name pools', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const nameParts = generateCharacter({ theme: TEST_THEME }).character.name.split(' ');

    expect(TEST_THEME.basics.firstNames).toContain(nameParts[0] ?? '');
    expect(TEST_THEME.basics.lastNames).toContain(nameParts[1] ?? '');
  });

  it('includes the theme default tags on generated characters', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(generateCharacter({ theme: TEST_THEME }).character.tags).toEqual(
      expect.arrayContaining(TEST_THEME.defaultTags ?? [])
    );
  });

  it('generates a female character with BASE_THEME when the first random value is below 0.5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);

    expect(generateCharacter({ theme: BASE_THEME }).character.gender).toBe('female');
  });

  it('generates a male character with BASE_THEME when the first random value is at least 0.5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.75);

    expect(generateCharacter({ theme: BASE_THEME }).character.gender).toBe('male');
  });

  it('generates female characters with MODERN_WOMAN_THEME', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.75);

    expect(generateCharacter({ theme: MODERN_WOMAN_THEME }).character.gender).toBe('female');
  });

  it('generates male characters with MODERN_MAN_THEME', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);

    expect(generateCharacter({ theme: MODERN_MAN_THEME }).character.gender).toBe('male');
  });

  it('does not overwrite existing values in fill-empty mode', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = generateCharacter({
      theme: TEST_THEME,
      mode: 'fill-empty',
      existing: {
        name: 'Existing Name',
        age: 41,
        gender: 'male',
        tags: ['custom'],
      },
    });

    expect(result.character.name).toBe('Existing Name');
    expect(result.character.age).toBe(41);
    expect(result.character.gender).toBe('male');
    expect(result.character.tags).toEqual(['custom']);
  });

  it('omits preserved fields from meta.generatedFields in fill-empty mode', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = generateCharacter({
      theme: TEST_THEME,
      mode: 'fill-empty',
      existing: {
        name: 'Existing Name',
        age: 41,
        gender: 'male',
      },
    });

    expect(result.meta.generatedFields).not.toContain('name');
    expect(result.meta.generatedFields).not.toContain('age');
    expect(result.meta.generatedFields).not.toContain('gender');
  });

  it('overwrites existing values in overwrite-all mode', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = generateCharacter({
      theme: TEST_THEME,
      mode: 'overwrite-all',
      existing: {
        name: 'Existing Name',
        age: 41,
        gender: 'male',
        tags: ['custom'],
      },
    });

    expect(result.character.name).not.toBe('Existing Name');
    expect(result.character.age).not.toBe(41);
    expect(result.character.gender).toBe('female');
    expect(result.character.tags).toEqual(expect.arrayContaining(['generated', 'test-theme']));
  });

  it('generates a physique object with nested build properties', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const physique = generateCharacter({ theme: TEST_THEME }).character.physique;

    expect(typeof physique).toBe('object');
    expect(physique).toMatchObject({
      build: {
        height: expect.any(String),
        torso: expect.any(String),
        skinTone: expect.any(String),
        arms: { build: expect.any(String), length: expect.any(String) },
        legs: { build: expect.any(String), length: expect.any(String) },
        feet: { size: expect.any(String), shape: expect.any(String) },
      },
    });
  });

  it('generates a personalityMap with the core personality dimensions', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const personalityMap = generateCharacter({ theme: TEST_THEME }).character.personalityMap;

    expect(personalityMap?.dimensions).toMatchObject({
      openness: expect.any(Number),
      conscientiousness: expect.any(Number),
      extraversion: expect.any(Number),
      agreeableness: expect.any(Number),
      neuroticism: expect.any(Number),
    });
  });

  it('filters body regions by gender for female characters', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = generateCharacter({ theme: TEST_THEME });

    expect(result.character.body).toHaveProperty('leftBreast');
    expect(result.character.body).not.toHaveProperty('penis');
    expect(result.meta.skippedFields).toContain('body.penis');
  });

  it('filters body regions by gender for male characters', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = generateCharacter({
      theme: TEST_THEME,
      existing: { gender: 'male' },
      mode: 'fill-empty',
    });

    expect(result.character.body).toHaveProperty('penis');
    expect(result.character.body).not.toHaveProperty('leftBreast');
    expect(result.meta.skippedFields).toContain('body.leftBreast');
  });

  it('respects a regionPopulationRate of 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = generateCharacter({
      theme: {
        ...TEST_THEME,
        id: 'empty-body-theme',
        body: {
          ...TEST_THEME.body,
          regionPopulationRate: 0,
        },
      },
    });

    expect(result.character.body).toEqual({});
  });

  it('populates all applicable configured regions when regionPopulationRate is 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = generateCharacter({ theme: TEST_THEME });

    expect(result.character.body).toHaveProperty('hair');
    expect(result.character.body).toHaveProperty('mouth');
    expect(result.character.body).toHaveProperty('leftBreast');
  });

  it('generates details within the configured count range', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const details = generateCharacter({ theme: TEST_THEME }).character.details;

    expect(details).toHaveLength(2);
  });

  it('records a valid ISO timestamp in meta.generatedAt', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const generatedAt = generateCharacter({ theme: TEST_THEME }).meta.generatedAt;

    expect(Number.isNaN(Date.parse(generatedAt))).toBe(false);
  });
});

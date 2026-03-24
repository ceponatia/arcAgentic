import {
  CORE_EMOTIONS,
  CORE_VALUES,
  EmotionalStateSchema,
  PERSONALITY_DIMENSIONS,
  PERSONALITY_FACETS,
  PersonalityMapSchema,
} from '@arcagentic/schemas';

describe('Personality schemas and constants', () => {
  it('defines exactly five personality dimensions', () => {
    expect(PERSONALITY_DIMENSIONS).toHaveLength(5);
  });

  it('defines facets for every dimension', () => {
    PERSONALITY_DIMENSIONS.forEach((dimension) => {
      expect(PERSONALITY_FACETS[dimension]).toBeDefined();
      expect(PERSONALITY_FACETS[dimension].length).toBeGreaterThan(0);
    });
  });

  it('defines non-empty core emotions and core values lists', () => {
    expect(CORE_EMOTIONS.length).toBeGreaterThan(0);
    expect(CORE_VALUES.length).toBeGreaterThan(0);
  });

  it('parses a valid emotional state', () => {
    const result = EmotionalStateSchema.parse({
      current: 'joy',
      intensity: 'strong',
      blend: 'trust',
      moodBaseline: 'anticipation',
      moodStability: 0.8,
    });

    expect(result).toEqual({
      current: 'joy',
      intensity: 'strong',
      blend: 'trust',
      moodBaseline: 'anticipation',
      moodStability: 0.8,
    });
  });

  it('applies emotional state defaults', () => {
    const result = EmotionalStateSchema.parse({});

    expect(result).toEqual({
      current: 'anticipation',
      intensity: 'mild',
      moodBaseline: 'trust',
      moodStability: 0.5,
    });
  });

  it('accepts personality maps with all five dimension keys present', () => {
    const result = PersonalityMapSchema.safeParse({
      dimensions: {
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
      },
    });

    expect(result.success).toBe(true);
  });
});

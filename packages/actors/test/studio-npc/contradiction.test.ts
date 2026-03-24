import { describe, expect, it } from 'vitest';
import type { CharacterProfile } from '@arcagentic/schemas';

import { ContradictionMirror } from '../../src/studio-npc/contradiction.js';
import type { InferredTrait } from '../../src/studio-npc/types.js';

function createTrait(overrides: Partial<InferredTrait> = {}): InferredTrait {
  return {
    path: 'personalityMap.dimensions.openness',
    value: 0.9,
    confidence: 0.9,
    evidence: 'The character embraces novelty.',
    ...overrides,
  };
}

describe('ContradictionMirror', () => {
  const mirror = new ContradictionMirror();

  it('returns null when the trait path does not exist in the profile', () => {
    const profile = {} as Partial<CharacterProfile>;

    expect(mirror.detectContradiction(createTrait(), profile)).toBeNull();
  });

  it('detects number conflicts when values differ by more than 0.3', () => {
    const profile = {
      personalityMap: {
        dimensions: {
          openness: 0.2,
        },
      },
    } as Partial<CharacterProfile>;

    const contradiction = mirror.detectContradiction(createTrait({ value: 0.9 }), profile);

    expect(contradiction).toEqual({
      existingTrait: { path: 'personalityMap.dimensions.openness', value: 0.2 },
      newEvidence: { path: 'personalityMap.dimensions.openness', value: 0.9 },
      reflectionPrompt: expect.stringContaining('openness'),
    });
  });

  it('does not flag number conflicts when values stay within 0.3', () => {
    const profile = {
      personalityMap: {
        dimensions: {
          openness: 0.45,
        },
      },
    } as Partial<CharacterProfile>;

    expect(mirror.detectContradiction(createTrait({ value: 0.7 }), profile)).toBeNull();
  });

  it('detects string conflicts case-insensitively when values differ', () => {
    const profile = {
      personalityMap: {
        speech: {
          directness: 'gentle',
        },
      },
    } as Partial<CharacterProfile>;

    const contradiction = mirror.detectContradiction(
      createTrait({
        path: 'personalityMap.speech.directness',
        value: 'blunt',
      }),
      profile
    );

    expect(contradiction).toEqual({
      existingTrait: { path: 'personalityMap.speech.directness', value: 'gentle' },
      newEvidence: { path: 'personalityMap.speech.directness', value: 'blunt' },
      reflectionPrompt: expect.stringContaining('directness'),
    });
  });

  it('does not flag string conflicts when values differ only by case', () => {
    const profile = {
      personalityMap: {
        speech: {
          directness: 'Gentle',
        },
      },
    } as Partial<CharacterProfile>;

    expect(
      mirror.detectContradiction(
        createTrait({
          path: 'personalityMap.speech.directness',
          value: 'gentle',
        }),
        profile
      )
    ).toBeNull();
  });

  it('returns contradiction objects with the expected fields', () => {
    const profile = {
      personalityMap: {
        dimensions: {
          openness: 0.1,
        },
      },
    } as Partial<CharacterProfile>;

    const contradiction = mirror.detectContradiction(createTrait({ value: 0.85 }), profile);

    expect(contradiction).toMatchObject({
      existingTrait: {
        path: 'personalityMap.dimensions.openness',
        value: 0.1,
      },
      newEvidence: {
        path: 'personalityMap.dimensions.openness',
        value: 0.85,
      },
    });
    expect(contradiction?.reflectionPrompt).toContain('contradiction');
  });

  it('builds reflection prompts that mention the old and new values', () => {
    const prompt = mirror.buildReflectionPrompt(
      'personalityMap.dimensions.openness',
      0.8,
      0.1
    );

    expect(prompt).toContain('openness');
    expect(prompt).toContain('strongly inclined');
    expect(prompt).toContain('resistant');
  });
});

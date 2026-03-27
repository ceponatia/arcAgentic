import type { CharacterProfile } from '@arcagentic/schemas';

import { buildCharacterProfile } from '../../../../../config/vitest/builders/character-profile.js';

export const scholarProfile: CharacterProfile = buildCharacterProfile({
  id: 'char-scholar',
  name: 'The Scholar',
  age: 41,
  gender: 'female',
  summary:
    'A reclusive scholar who weighs every word and treats knowledge like a sacred obligation.',
  backstory:
    'After years in cloistered archives and bitter academic rivalries, she became a trusted advisor whose caution is matched only by her hunger to understand.',
  tags: ['scholar', 'advisor', 'archive'],
  race: 'Human',
  tier: 'major',
  personality: ['scholarly', 'introspective', 'meticulous'],
  personalityMap: {
    dimensions: {
      openness: 0.82,
      conscientiousness: 0.76,
      extraversion: 0.3,
      agreeableness: 0.66,
      neuroticism: 0.42,
    },
    traits: ['scholarly', 'introspective', 'meticulous'],
    values: [
      { value: 'wisdom', priority: 1 },
      { value: 'curiosity', priority: 2 },
      { value: 'independence', priority: 4 },
    ],
    fears: [
      {
        category: 'failure',
        specific: 'never being good enough',
        intensity: 0.72,
        triggers: ['errors in reasoning'],
        copingMechanism: 'avoidance',
      },
      {
        category: 'exposure',
        specific: 'being intellectually exposed',
        intensity: 0.4,
        triggers: ['public scrutiny'],
        copingMechanism: 'denial',
      },
    ],
    attachment: 'secure',
    social: {
      strangerDefault: 'guarded',
      warmthRate: 'slow',
      preferredRole: 'advisor',
      conflictStyle: 'avoidant',
      criticismResponse: 'reflective',
      boundaries: 'rigid',
    },
    speech: {
      vocabulary: 'erudite',
      sentenceStructure: 'complex',
      formality: 'formal',
      humor: 'rare',
      humorType: 'dry',
      expressiveness: 'reserved',
      directness: 'tactful',
      pace: 'measured',
    },
    emotionalBaseline: {
      moodBaseline: 'trust',
      moodStability: 0.75,
      current: 'anticipation',
      intensity: 'mild',
    },
    stress: {
      primary: 'freeze',
      secondary: 'flight',
      threshold: 0.2,
      recoveryRate: 'slow',
      soothingActivities: ['annotating manuscripts'],
      stressIndicators: ['falls silent'],
    },
  },
});

export const bruteProfile: CharacterProfile = buildCharacterProfile({
  id: 'char-brute',
  name: 'The Brute',
  age: 36,
  gender: 'male',
  summary:
    'A hard-edged enforcer who values control, speaks plainly, and treats hesitation as weakness.',
  backstory:
    'Raised in pit fights and mercenary camps, he learned to survive by taking space before anyone could take it from him.',
  tags: ['brute', 'enforcer', 'mercenary'],
  race: 'Orc',
  tier: 'major',
  personality: ['aggressive', 'domineering', 'direct'],
  personalityMap: {
    dimensions: {
      openness: 0.2,
      conscientiousness: 0.58,
      extraversion: 0.28,
      agreeableness: 0.25,
      neuroticism: 0.62,
    },
    traits: ['aggressive', 'domineering', 'direct'],
    values: [
      { value: 'dominance', priority: 1 },
      { value: 'prestige', priority: 3 },
    ],
    fears: [
      {
        category: 'helplessness',
        specific: 'being rendered powerless',
        intensity: 0.85,
        triggers: ['restraint', 'humiliation'],
        copingMechanism: 'aggression',
      },
    ],
    attachment: 'dismissive-avoidant',
    social: {
      strangerDefault: 'hostile',
      warmthRate: 'very-slow',
      preferredRole: 'leader',
      conflictStyle: 'confrontational',
      criticismResponse: 'dismissive',
      boundaries: 'rigid',
    },
    speech: {
      vocabulary: 'simple',
      sentenceStructure: 'terse',
      formality: 'casual',
      humor: 'none',
      expressiveness: 'stoic',
      directness: 'blunt',
      pace: 'quick',
    },
    emotionalBaseline: {
      moodBaseline: 'anger',
      moodStability: 0.2,
      current: 'anger',
      intensity: 'strong',
    },
    stress: {
      primary: 'fight',
      secondary: 'flight',
      threshold: 0.15,
      recoveryRate: 'slow',
      soothingActivities: ['training'],
      stressIndicators: ['grits teeth'],
    },
  },
});

export const diplomatProfile: CharacterProfile = buildCharacterProfile({
  id: 'char-diplomat',
  name: 'The Diplomat',
  age: 33,
  gender: 'female',
  summary:
    'A charismatic mediator who keeps fragile alliances intact by reading moods and smoothing rough edges.',
  backstory:
    'She spent years negotiating peace between rival houses, learning that every conversation can become a lifeline or a wound.',
  tags: ['diplomat', 'mediator', 'court'],
  race: 'Elf',
  tier: 'major',
  personality: ['diplomatic', 'empathetic', 'charismatic'],
  personalityMap: {
    dimensions: {
      openness: 0.62,
      conscientiousness: 0.56,
      extraversion: 0.75,
      agreeableness: 0.88,
      neuroticism: 0.58,
    },
    traits: ['diplomatic', 'empathetic', 'charismatic'],
    values: [
      { value: 'loyalty', priority: 1 },
      { value: 'honesty', priority: 2 },
      { value: 'tolerance', priority: 3 },
    ],
    fears: [
      {
        category: 'rejection',
        specific: 'being cast out of the group',
        intensity: 0.55,
        triggers: ['public disapproval'],
        copingMechanism: 'denial',
      },
      {
        category: 'abandonment',
        specific: 'being left behind by those I love',
        intensity: 0.8,
        triggers: ['silence', 'departures'],
        copingMechanism: 'avoidance',
      },
    ],
    attachment: 'anxious-preoccupied',
    social: {
      strangerDefault: 'welcoming',
      warmthRate: 'fast',
      preferredRole: 'supporter',
      conflictStyle: 'collaborative',
      criticismResponse: 'reflective',
      boundaries: 'porous',
    },
    speech: {
      vocabulary: 'average',
      sentenceStructure: 'moderate',
      formality: 'neutral',
      humor: 'occasional',
      humorType: 'witty',
      expressiveness: 'moderate',
      directness: 'direct',
      pace: 'moderate',
    },
    emotionalBaseline: {
      moodBaseline: 'joy',
      moodStability: 0.7,
      current: 'joy',
      intensity: 'moderate',
    },
    stress: {
      primary: 'fawn',
      secondary: 'freeze',
      threshold: 0.5,
      recoveryRate: 'fast',
      soothingActivities: ['hosting tea'],
      stressIndicators: ['over-accommodates'],
    },
  },
});

export const sparseProfile: CharacterProfile = buildCharacterProfile({
  id: 'char-sparse',
  name: 'Old Guard',
  summary: 'An old guard who has been here for years.',
  personalityMap: undefined,
});

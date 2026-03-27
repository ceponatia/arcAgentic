import { describe, expect, it } from 'vitest';
import type { CharacterProfile, SpeechStyle, WorldEvent } from '@arcagentic/schemas';

import { buildMovedEffect, buildSpokeEffect } from '../../../../config/vitest/builders/world-event.js';
import {
  bruteProfile,
  diplomatProfile,
  scholarProfile,
  sparseProfile,
} from './fixtures/personality-fixtures.js';
import {
  buildNpcCognitionPrompt,
  buildSpeechStyleDirective,
  buildSystemPrompt,
  NPC_DECISION_SYSTEM_PROMPT,
} from '../../src/npc/prompts.js';
import type { NpcRuntimeState, PerceptionContext } from '../../src/npc/types.js';

const DEFAULT_SPEECH_STYLE: SpeechStyle = {
  vocabulary: 'average',
  sentenceStructure: 'moderate',
  formality: 'neutral',
  humor: 'occasional',
  expressiveness: 'moderate',
  directness: 'direct',
  pace: 'moderate',
};

function createNpcState(overrides: Partial<NpcRuntimeState> = {}): NpcRuntimeState {
  return {
    id: 'npc-001',
    type: 'npc',
    npcId: 'npc-001',
    locationId: 'loc-001',
    sessionId: 'session-001',
    spawnedAt: new Date('2025-01-01T00:00:00Z'),
    lastActiveAt: new Date('2025-01-01T00:00:00Z'),
    recentEvents: [],
    goals: [],
    ...overrides,
  };
}

function createPerception(events: WorldEvent[] = []): PerceptionContext {
  return {
    relevantEvents: events,
    nearbyActors: [],
  };
}

function createProfile(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char-001',
    name: 'Mara',
    summary: 'A guarded sentinel who chooses her words carefully.',
    backstory: 'Mara survived a long border war and now trusts slowly.',
    ...overrides,
  } as CharacterProfile;
}

describe('buildSpeechStyleDirective', () => {
  it('returns undefined for undefined input', () => {
    expect(buildSpeechStyleDirective()).toBeUndefined();
  });

  it('returns undefined for all-default speech style', () => {
    expect(buildSpeechStyleDirective(DEFAULT_SPEECH_STYLE)).toBeUndefined();
  });

  it('includes a vocabulary directive for non-default vocabulary', () => {
    expect(
      buildSpeechStyleDirective({
        ...DEFAULT_SPEECH_STYLE,
        vocabulary: 'simple',
      })
    ).toBe('Use simple, everyday words. Avoid complex vocabulary.');
  });

  it('combines multiple non-default directives', () => {
    expect(
      buildSpeechStyleDirective({
        ...DEFAULT_SPEECH_STYLE,
        vocabulary: 'educated',
        sentenceStructure: 'terse',
        formality: 'formal',
      })
    ).toBe(
      'Use educated, precise language with good grammar. Speak formally. Use proper grammar and respectful language. Use very short sentences. Fragments are fine. Get to the point.'
    );
  });

  it('includes humor type when present', () => {
    expect(
      buildSpeechStyleDirective({
        ...DEFAULT_SPEECH_STYLE,
        humor: 'frequent',
        humorType: 'dry',
      })
    ).toBe('Frequently use dry, understated humor.');
  });
});

describe('buildSystemPrompt', () => {
  it('returns the default system prompt when speech style is absent', () => {
    expect(buildSystemPrompt()).toBe(NPC_DECISION_SYSTEM_PROMPT);
  });

  it('includes a speech style requirements section when speech style is present', () => {
    const prompt = buildSystemPrompt({
      ...DEFAULT_SPEECH_STYLE,
      vocabulary: 'archaic',
    });

    expect(prompt).toContain('Speech style requirements:');
    expect(prompt).toContain(
      'Use archaic, old-fashioned language. Thee, thou, henceforth.'
    );
  });
});

describe('buildNpcCognitionPrompt', () => {
  it('keeps the sparse prompt shape when personalityMap is empty', () => {
    const prompt = buildNpcCognitionPrompt(
      createPerception([buildSpokeEffect({ actorId: 'actor-002', sessionId: 'session-001' })]),
      createNpcState(),
      createProfile({ personalityMap: {} as CharacterProfile['personalityMap'] })
    );

    expect(prompt).toBe([
      'NPC: Mara',
      'Summary: A guarded sentinel who chooses her words carefully.',
      'Backstory: Mara survived a long border war and now trusts slowly.',
      'Recent events:',
      '- actor-002 said: "Test message"',
      'Instruction: Decide the next thing the NPC should say.',
    ].join('\n'));
  });

  it('renders only the values section for a partial personality map', () => {
    const prompt = buildNpcCognitionPrompt(
      createPerception(),
      createNpcState(),
      createProfile({
        personalityMap: {
          values: [
            { value: 'justice', priority: 4 },
            { value: 'loyalty', priority: 1 },
          ],
        },
      })
    );

    expect(prompt).toContain('Values: loyalty (paramount), justice (strong)');
    expect(prompt).not.toContain('Personality:');
    expect(prompt).not.toContain('Traits:');
    expect(prompt).not.toContain('Fears:');
    expect(prompt).not.toContain('Social:');
    expect(prompt).not.toContain('Speech:');
    expect(prompt).not.toContain('Emotional baseline:');
    expect(prompt).not.toContain('Under stress:');
  });

  it('renders all enriched personality sections in the expected order', () => {
    const prompt = buildNpcCognitionPrompt(
      createPerception([
        buildMovedEffect({
          actorId: 'actor-002',
          sessionId: 'session-001',
          fromLocationId: 'loc-999',
          toLocationId: 'loc-001',
        }),
        buildSpokeEffect({ actorId: 'actor-003', sessionId: 'session-001' }),
      ]),
      createNpcState(),
      createProfile({
        personalityMap: {
          dimensions: {
            openness: 0.82,
            conscientiousness: 0.22,
            extraversion: 0.3,
            agreeableness: 0.74,
            neuroticism: 0.88,
          },
          traits: ['guarded', 'loyal'],
          values: [
            { value: 'justice', priority: 4 },
            { value: 'loyalty', priority: 1 },
            { value: 'curiosity', priority: 5 },
          ],
          fears: [
            {
              category: 'failure',
              specific: 'never being good enough',
              intensity: 0.72,
              triggers: ['mistakes'],
              copingMechanism: 'avoidance',
            },
            {
              category: 'abandonment',
              specific: 'being left behind',
              intensity: 0.55,
              triggers: ['distance'],
              copingMechanism: 'denial',
            },
          ],
          social: {
            strangerDefault: 'guarded',
            warmthRate: 'slow',
            preferredRole: 'advisor',
            conflictStyle: 'avoidant',
            criticismResponse: 'defensive',
            boundaries: 'rigid',
          },
          speech: {
            vocabulary: 'erudite',
            sentenceStructure: 'complex',
            formality: 'formal',
            humor: 'frequent',
            humorType: 'dry',
            expressiveness: 'reserved',
            directness: 'tactful',
            pace: 'measured',
          },
          emotionalBaseline: {
            current: 'anticipation',
            intensity: 'mild',
            moodBaseline: 'trust',
            moodStability: 0.55,
          },
          stress: {
            primary: 'freeze',
            secondary: 'flight',
            threshold: 0.2,
            recoveryRate: 'slow',
            soothingActivities: ['walking'],
            stressIndicators: ['goes quiet'],
          },
        },
      })
    );

    const lines = prompt.split('\n');
    const orderedPrefixes = [
      'NPC:',
      'Personality:',
      'Traits:',
      'Values:',
      'Fears:',
      'Social:',
      'Speech:',
      'Emotional baseline:',
      'Under stress:',
      'Summary:',
      'Backstory:',
      'Recent events:',
      'Instruction:',
    ];

    const indexes = orderedPrefixes.map((prefix) =>
      lines.findIndex((line) => line.startsWith(prefix))
    );

    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((left, right) => left - right));
    expect(prompt).toContain(
      'Speech: erudite vocabulary, complex sentences, formal tone, frequent dry humor, reserved delivery, tactful phrasing, measured pace'
    );
  });

  it('orders values by ascending priority and keeps the top three', () => {
    const prompt = buildNpcCognitionPrompt(
      createPerception(),
      createNpcState(),
      createProfile({
        personalityMap: {
          values: [
            { value: 'curiosity', priority: 6 },
            { value: 'loyalty', priority: 1 },
            { value: 'justice', priority: 4 },
            { value: 'freedom', priority: 9 },
          ],
        },
      })
    );

    expect(prompt).toContain('Values: loyalty (paramount), justice (strong), curiosity (moderate)');
    expect(prompt).not.toContain('freedom (slight)');
  });

  it('omits moderate dimensions and renders only notable deviations', () => {
    const prompt = buildNpcCognitionPrompt(
      createPerception(),
      createNpcState(),
      createProfile({
        personalityMap: {
          dimensions: {
            openness: 0.91,
            conscientiousness: 0.5,
            extraversion: 0.3,
            agreeableness: 0.68,
            neuroticism: 0.5,
          },
        },
      })
    );

    expect(prompt).toContain(
      'Personality: very open and curious, reserved and introspective, cooperative and trusting'
    );
    expect(prompt).not.toContain('disciplined and organized');
    expect(prompt).not.toContain('calm and stable');
  });

  it('orders fears by descending intensity', () => {
    const prompt = buildNpcCognitionPrompt(
      createPerception(),
      createNpcState(),
      createProfile({
        personalityMap: {
          fears: [
            {
              category: 'abandonment',
              specific: 'being left behind',
              intensity: 0.45,
              triggers: ['silence'],
              copingMechanism: 'denial',
            },
            {
              category: 'failure',
              specific: 'never being good enough',
              intensity: 0.83,
              triggers: ['mistakes'],
              copingMechanism: 'avoidance',
            },
          ],
        },
      })
    );

    expect(prompt).toContain(
      'Fears: failure - "never being good enough" (overwhelming), abandonment - "being left behind" (moderate)'
    );
  });

  it('skips the social line when all social values are defaults', () => {
    const prompt = buildNpcCognitionPrompt(
      createPerception(),
      createNpcState(),
      createProfile({
        personalityMap: {
          social: {
            strangerDefault: 'neutral',
            warmthRate: 'moderate',
            preferredRole: 'supporter',
            conflictStyle: 'diplomatic',
            criticismResponse: 'reflective',
            boundaries: 'healthy',
          },
        },
      })
    );

    expect(prompt).not.toContain('Social:');
  });

  it('skips the speech line when all speech values are defaults', () => {
    const prompt = buildNpcCognitionPrompt(
      createPerception(),
      createNpcState(),
      createProfile({
        personalityMap: {
          speech: {
            vocabulary: 'average',
            sentenceStructure: 'moderate',
            formality: 'neutral',
            humor: 'occasional',
            expressiveness: 'moderate',
            directness: 'direct',
            pace: 'moderate',
          },
        },
      })
    );

    expect(prompt).not.toContain('Speech:');
  });

  it('formats stress behavior with primary and secondary responses', () => {
    const prompt = buildNpcCognitionPrompt(
      createPerception(),
      createNpcState(),
      createProfile({
        personalityMap: {
          stress: {
            primary: 'freeze',
            secondary: 'flight',
            threshold: 0.2,
            recoveryRate: 'slow',
            soothingActivities: ['walking'],
            stressIndicators: ['goes quiet'],
          },
        },
      })
    );

    expect(prompt).toContain('Under stress: freezes then flees, low threshold, slow recovery');
  });
});

describe('snapshot tests with archetype fixtures', () => {
  const perception = createPerception([
    buildSpokeEffect({
      actorId: 'actor-777',
      sessionId: 'session-001',
      content: 'State your business.',
    }),
  ]);

  it.each([
    ['scholar', scholarProfile],
    ['brute', bruteProfile],
    ['diplomat', diplomatProfile],
    ['sparse', sparseProfile],
  ])('matches cognition prompt snapshot for %s', (_label, profile) => {
    expect(buildNpcCognitionPrompt(perception, createNpcState(), profile)).toMatchSnapshot();
  });

  it.each([
    ['scholar', scholarProfile],
    ['brute', bruteProfile],
    ['diplomat', diplomatProfile],
  ])('matches system prompt snapshot for %s', (_label, profile) => {
    expect(buildSystemPrompt(profile.personalityMap?.speech)).toMatchSnapshot();
  });
});

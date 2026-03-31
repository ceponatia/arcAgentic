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
  renderProximityDescription,
  buildSpeechStyleDirective,
  buildStructuredOutputInstruction,
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

  it('uses embodiment-style agency guidance without a hard dialogue cap', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain(
      'You are inhabiting a character in a living world. You have your own wants, feelings, and momentum.'
    );
    expect(prompt).toContain(
      'You are not obligated to answer or perform. If nothing truly calls for action, continue what you were doing or respond with NO_ACTION.'
    );
    expect(prompt).toContain('Do not control the player or invent the player\'s thoughts, words, or actions.');
    expect(prompt).not.toContain('max 20 words');
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

describe('renderProximityDescription', () => {
  it('maps supported proximity levels to natural-language descriptions', () => {
    expect(renderProximityDescription('distant')).toBe(
      'The player is far away, barely visible or audible.'
    );
    expect(renderProximityDescription('near')).toBe(
      'The player is nearby, within ordinary conversation distance.'
    );
    expect(renderProximityDescription('close')).toBe(
      'The player is within arm\'s reach.'
    );
    expect(renderProximityDescription('intimate')).toBe(
      'The player is in direct physical contact or immediate physical closeness with you.'
    );
    expect(renderProximityDescription('unknown')).toBe('');
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
      '## Current Situation',
      '[Time: not yet tracked]',
      'Recent events:',
      '- actor-002 said: "Test message"',
      'Instruction: Decide the NPC\'s next response in character.',
      buildStructuredOutputInstruction(),
    ].join('\n'));
  });

  it('adds direct-address context when the player is speaking to the npc', () => {
    const prompt = buildNpcCognitionPrompt(
      createPerception([
        {
          type: 'SPOKE',
          actorId: 'player:test',
          sessionId: 'session-001',
          content: 'Look at me.',
          timestamp: new Date('2025-01-01T00:00:00Z'),
        } as WorldEvent,
      ]),
      createNpcState(),
      createProfile(),
      undefined,
      { playerAddressedDirectly: true }
    );

    expect(prompt).toContain('The player is speaking directly to you.');
  });

  it('adds overheard context when the player was not addressing the npc', () => {
    const prompt = buildNpcCognitionPrompt(
      createPerception([
        {
          type: 'SPOKE',
          actorId: 'player:test',
          sessionId: 'session-001',
          content: 'Anyone here?',
          timestamp: new Date('2025-01-01T00:00:00Z'),
        } as WorldEvent,
      ]),
      createNpcState(),
      createProfile(),
      undefined,
      { playerAddressedDirectly: false }
    );

    expect(prompt).toContain(
      'You overheard the player speaking, but they were not addressing you specifically.'
    );
  });

  it('renders a natural-language character summary for a partial personality map', () => {
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

    expect(prompt).toContain('Character: What matters most to Mara is loyalty and justice.');
    expect(prompt).not.toContain('Personality:');
    expect(prompt).not.toContain('Traits:');
    expect(prompt).not.toContain('Fears:');
    expect(prompt).not.toContain('Social patterns:');
    expect(prompt).not.toContain('Emotional baseline:');
    expect(prompt).not.toContain('Stress behavior:');
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
      'Character:',
      'Social patterns:',
      'Emotional baseline:',
      'Stress behavior:',
      'Summary:',
      'Backstory:',
      '## Current Situation',
      '[Time: not yet tracked]',
      'Recent events:',
      'Instruction:',
    ];

    const indexes = orderedPrefixes.map((prefix) =>
      lines.findIndex((line) => line.startsWith(prefix))
    );

    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((left, right) => left - right));
    expect(prompt).toContain(
      'Character: Mara is very open and curious, spontaneous and flexible, reserved and introspective, cooperative and trusting, and very anxious and reactive, with guarded and loyal instincts. What matters most to Mara is loyalty, justice, and curiosity. They fear never being good enough and being left behind. They speak with erudite vocabulary, complex sentences, formal tone, frequent dry humor, reserved delivery, tactful phrasing, and measured pace.'
    );
  });

  it('renders environment, activity, proximity, and nearby NPC context in the current situation section', () => {
    const prompt = buildNpcCognitionPrompt(
      createPerception(),
      createNpcState(),
      createProfile(),
      undefined,
      {
        locationName: 'Moonlit Bathhouse',
        locationDescription: 'Steam curls through blue lantern light',
        currentActivity: {
          type: 'bathing',
          description: 'soaking in the hot spring',
          engagement: 'absorbed',
        },
        playerProximity: 'intimate',
        interruptible: false,
        nearbyNpcSummaries: ['Iris: folding towels', 'Jun: humming by the doorway'],
      },
    );

    expect(prompt).toContain('## Current Situation');
    expect(prompt).toContain(
      'You are at Moonlit Bathhouse. Steam curls through blue lantern light.'
    );
    expect(prompt).toContain('You are currently: soaking in the hot spring (absorbed)');
    expect(prompt).toContain(
      'You are deeply engaged in this and would need a good reason to stop.'
    );
    expect(prompt).toContain('You cannot be interrupted right now.');
    expect(prompt).toContain(
      'The player is in direct physical contact or immediate physical closeness with you.'
    );
    expect(prompt).toContain(
      'Physical closeness is relevant to this scene. Be aware of physical sensations, warmth, touch, and the intimacy of the moment when deciding your response.'
    );
    expect(prompt).toContain('Others nearby:');
    expect(prompt).toContain('- Iris: folding towels');
    expect(prompt).toContain('- Jun: humming by the doorway');
  });

  it('renders the explicit setting fallback when no narrator history is available', () => {
    const prompt = buildNpcCognitionPrompt(
      createPerception(),
      createNpcState(),
      createProfile(),
      undefined,
      {
        startingScenario:
          'Moonlight spills across the empty bathhouse as steam coils above the water.',
      }
    );

    expect(prompt).toContain(
      '\n## Setting\nMoonlight spills across the empty bathhouse as steam coils above the water.'
    );
  });

  it('does not duplicate the setting fallback when narrator history already contains scene context', () => {
    const prompt = buildNpcCognitionPrompt(
      {
        ...createPerception(),
        narratorHistory: [
          'Moonlight spills across the empty bathhouse as steam coils above the water.',
        ],
      },
      createNpcState(),
      createProfile(),
      undefined,
      {
        startingScenario:
          'Moonlight spills across the empty bathhouse as steam coils above the water.',
      }
    );

    expect(prompt).not.toContain('## Setting');
    expect(prompt).toContain('## Recent Scene Context');
    expect(prompt).toContain(
      'Moonlight spills across the empty bathhouse as steam coils above the water.'
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

    expect(prompt).toContain('What matters most to Mara is loyalty, justice, and curiosity.');
    expect(prompt).not.toContain('freedom');
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
      'Character: Mara is very open and curious, reserved and introspective, and cooperative and trusting.'
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

    expect(prompt).toContain('They fear never being good enough and being left behind.');
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

    expect(prompt).not.toContain('Social patterns:');
  });

  it('skips the character summary when only default speech values are present', () => {
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

    expect(prompt).not.toContain('Character:');
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

    expect(prompt).toContain(
      'Stress behavior: Under pressure, tends to freeze then flee, rattles easily, and recovers slow.'
    );
  });

  it('includes the full backstory without hard truncation', () => {
    const longBackstory =
      'Mara kept a journal through the border war, then spent years carrying messages between ruined towers, learning every oath, betrayal, and burial path along the frontier without ever finding a place that felt fully safe.';

    const prompt = buildNpcCognitionPrompt(
      createPerception(),
      createNpcState(),
      createProfile({ backstory: longBackstory })
    );

    expect(prompt).toContain(`Backstory: ${longBackstory}`);
  });

  it('adds a sensory focus section after recent events when player appeal tags are triggered', () => {
    const prompt = buildNpcCognitionPrompt(
      createPerception([
        buildSpokeEffect({
          actorId: 'player',
          sessionId: 'session-001',
          content: 'I want to touch hair and stay close.',
        }),
      ]),
      createNpcState(),
      createProfile({
        body: {
          hair: {
            scent: { primary: 'lavender', intensity: 0.4 },
            texture: { primary: 'silky', temperature: 'warm', moisture: 'normal' },
          },
        },
      }),
      undefined,
      {
        playerName: 'Avery',
        playerAppealTags: ['hair'],
      },
    );

    const lines = prompt.split('\n');
    const recentEventsIndex = lines.findIndex((line) => line === 'Recent events:');
    const sensoryFocusIndex = lines.findIndex((line) => line === 'Sensory focus:');
    const instructionIndex = lines.findIndex((line) => line.startsWith('Instruction:'));

    expect(sensoryFocusIndex).toBeGreaterThan(recentEventsIndex);
    expect(sensoryFocusIndex).toBeLessThan(instructionIndex);
    expect(prompt).toContain("The player is especially drawn to Mara's hair.");
    expect(prompt).toContain('warm, silky texture and lavender scent');
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

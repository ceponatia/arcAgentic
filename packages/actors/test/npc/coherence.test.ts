import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Effect } from 'effect';
import type { LLMMessage } from '@arcagentic/llm';
import type { CharacterProfile, WorldEvent } from '@arcagentic/schemas';

import { buildCharacterProfile } from '../../../../config/vitest/builders/character-profile.js';
import {
  buildActorSpawnEvent,
  buildMovedEffect,
  buildSpokeEffect,
} from '../../../../config/vitest/builders/world-event.js';
import { mockLlmProvider } from '../../../../config/vitest/mocks/llm.js';
import { CognitionLayer } from '../../src/npc/cognition.js';
import {
  buildNpcCognitionPrompt,
  buildSystemPrompt,
  NPC_DECISION_SYSTEM_PROMPT,
} from '../../src/npc/prompts.js';
import { applyPersonalityModifiers } from '../../src/npc/personality-modifiers.js';
import type { CognitionContext, NpcRuntimeState } from '../../src/npc/types.js';
import {
  bruteProfile,
  diplomatProfile,
  scholarProfile,
  sparseProfile,
} from './fixtures/personality-fixtures.js';

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

function createContext(
  events: WorldEvent[],
  stateOverrides: Partial<NpcRuntimeState> = {}
): CognitionContext {
  return {
    perception: {
      relevantEvents: events,
      nearbyActors: [],
    },
    state: createNpcState(stateOverrides),
    availableActions: ['SPEAK_INTENT'],
  };
}

function createDamagedEvent(overrides: Partial<WorldEvent> = {}): WorldEvent {
  return {
    type: 'DAMAGED',
    actorId: 'actor-002',
    sessionId: 'session-001',
    timestamp: new Date('2025-01-01T00:00:00Z'),
    damage: 10,
    ...overrides,
  } as WorldEvent;
}

function createActorDespawnEvent(overrides: Partial<WorldEvent> = {}): WorldEvent {
  return {
    type: 'ACTOR_DESPAWN',
    actorId: 'actor-002',
    sessionId: 'session-001',
    timestamp: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  } as WorldEvent;
}

function getMessageContent(messages: LLMMessage[], role: 'system' | 'user'): string {
  const message = messages.find((entry) => entry.role === role);

  expect(message).toBeDefined();
  expect(typeof message?.content).toBe('string');

  return String(message?.content ?? '');
}

async function captureMessages(
  profile: CharacterProfile,
  events: WorldEvent[]
): Promise<{ messages: LLMMessage[]; result: Awaited<ReturnType<typeof CognitionLayer.decideLLM>> }> {
  const llmProvider = mockLlmProvider();
  let capturedMessages: LLMMessage[] = [];

  llmProvider.chat.mockImplementation((messages: LLMMessage[]) => {
    capturedMessages = messages;

    return Effect.succeed({
      id: 'llm-response-coherence',
      content: 'I have an answer.',
      tool_calls: null,
      usage: null,
    });
  });

  const result = await CognitionLayer.decideLLM(createContext(events), profile, llmProvider);

  return {
    messages: capturedMessages,
    result,
  };
}

describe('NPC personality coherence', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
    vi.spyOn(console, 'debug').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('personality-differentiated prompt assembly', () => {
    it('builds different system prompts for scholar and brute speech styles', () => {
      expect(buildSystemPrompt(scholarProfile.personalityMap?.speech)).not.toBe(
        buildSystemPrompt(bruteProfile.personalityMap?.speech)
      );
    });

    it('renders scholar and brute speech signatures in cognition prompts', () => {
      const scholarPrompt = buildNpcCognitionPrompt(
        createContext([buildSpokeEffect({ actorId: 'actor-002', sessionId: 'session-001' })])
          .perception,
        createNpcState(),
        scholarProfile
      );
      const brutePrompt = buildNpcCognitionPrompt(
        createContext([buildSpokeEffect({ actorId: 'actor-002', sessionId: 'session-001' })])
          .perception,
        createNpcState(),
        bruteProfile
      );

      expect(scholarPrompt).toContain('Speech: erudite vocabulary, complex sentences, formal tone');
      expect(brutePrompt).toContain('Speech: simple vocabulary, terse sentences, casual tone');
      expect(brutePrompt).toContain('no humor');
    });

    it('keeps the diplomat system prompt at the default baseline', () => {
      expect(buildSystemPrompt(diplomatProfile.personalityMap?.speech)).toBe(
        NPC_DECISION_SYSTEM_PROMPT
      );
    });

    it('uses the default system prompt when the profile has no speech style', () => {
      expect(buildSystemPrompt(sparseProfile.personalityMap?.speech)).toBe(
        NPC_DECISION_SYSTEM_PROMPT
      );
    });
  });

  describe('decideLLM assembles personality-specific messages', () => {
    it('assembles scholar-specific system and user messages', async () => {
      const { messages, result } = await captureMessages(scholarProfile, [
        buildSpokeEffect({
          actorId: 'actor-002',
          sessionId: 'session-001',
          content: 'What do you make of this text?',
        }),
      ]);

      const systemMessage = getMessageContent(messages, 'system');
      const userMessage = getMessageContent(messages, 'user');

      expect(result).toEqual({
        intent: expect.objectContaining({
          type: 'SPEAK_INTENT',
          actorId: 'npc-001',
          sessionId: 'session-001',
          content: 'I have an answer.',
        }),
        delayMs: 300,
      });
      expect(systemMessage).toContain('Speech style requirements:');
      expect(systemMessage).toContain(
        'Use sophisticated, precise vocabulary. Employ literary and academic terms.'
      );
      expect(systemMessage).toContain('Speak formally. Use proper grammar and respectful language.');
      expect(userMessage).toContain('Personality:');
      expect(userMessage).toContain('Values:');
      expect(userMessage).toContain('Fears:');
      expect(userMessage).toContain('Speech:');
      expect(userMessage).toContain('Under stress:');
    });

    it('assembles brute-specific user prompt sections', async () => {
      const { messages } = await captureMessages(bruteProfile, [
        buildSpokeEffect({
          actorId: 'actor-002',
          sessionId: 'session-001',
          content: 'Back off.',
        }),
      ]);

      const userMessage = getMessageContent(messages, 'user');

      expect(userMessage).toContain('simple vocabulary');
      expect(userMessage).toContain('terse sentences');
      expect(userMessage).toContain('Values: dominance');
      expect(userMessage).toContain('Under stress: fights then flees, low threshold, slow recovery');
    });

    it('assembles diplomat-specific relational context', async () => {
      const { messages } = await captureMessages(diplomatProfile, [
        buildSpokeEffect({
          actorId: 'actor-002',
          sessionId: 'session-001',
          content: 'We need your help settling this.',
        }),
      ]);

      const userMessage = getMessageContent(messages, 'user');

      expect(userMessage).toContain('cooperative and trusting');
      expect(userMessage).toContain('Values: loyalty');
      expect(userMessage).toContain('abandonment - "being left behind by those I love"');
    });

    it('keeps sparse profiles at the pre-enrichment baseline prompt format', async () => {
      const { messages } = await captureMessages(sparseProfile, [
        buildSpokeEffect({ actorId: 'actor-002', sessionId: 'session-001' }),
      ]);

      const userMessage = getMessageContent(messages, 'user');

      expect(userMessage).not.toContain('Personality:');
      expect(userMessage).not.toContain('Traits:');
      expect(userMessage).not.toContain('Values:');
      expect(userMessage).not.toContain('Fears:');
      expect(userMessage).not.toContain('Social:');
      expect(userMessage).not.toContain('Speech:');
      expect(userMessage).not.toContain('Emotional baseline:');
      expect(userMessage).not.toContain('Under stress:');
    });

    it('produces meaningfully different scholar and brute user prompts', async () => {
      const mixedEvents = [
        buildActorSpawnEvent({
          actorId: 'actor-010',
          sessionId: 'session-001',
          locationId: 'loc-001',
        }),
        buildMovedEffect({
          actorId: 'actor-002',
          sessionId: 'session-001',
          fromLocationId: 'loc-999',
          toLocationId: 'loc-001',
        }),
        buildSpokeEffect({
          actorId: 'actor-002',
          sessionId: 'session-001',
          content: 'Tell me what you know.',
        }),
      ];

      const scholarMessages = await captureMessages(scholarProfile, mixedEvents);
      const bruteMessages = await captureMessages(bruteProfile, mixedEvents);
      const scholarUserPrompt = getMessageContent(scholarMessages.messages, 'user');
      const bruteUserPrompt = getMessageContent(bruteMessages.messages, 'user');

      expect(scholarUserPrompt).not.toBe(bruteUserPrompt);
      expect(scholarUserPrompt).toContain('erudite vocabulary');
      expect(bruteUserPrompt).toContain('simple vocabulary');
      expect(scholarUserPrompt).toContain('wisdom');
      expect(bruteUserPrompt).toContain('dominance');
    });
  });

  describe('behavioral modifiers produce archetype-appropriate responses', () => {
    it('gives the brute high urgency and fight context after damage', () => {
      expect(
        applyPersonalityModifiers(bruteProfile.personalityMap, createContext([createDamagedEvent()]).perception)
      ).toEqual({
        urgency: 'high',
        socialBias: 'confront',
        contextNotes: ['instinct to fight'],
      });
    });

    it('gives the scholar high urgency and freeze context after damage', () => {
      expect(
        applyPersonalityModifiers(
          scholarProfile.personalityMap,
          createContext([createDamagedEvent()]).perception
        )
      ).toEqual({
        urgency: 'high',
        socialBias: 'avoid',
        contextNotes: ['tends to freeze'],
      });
    });

    it('raises diplomat urgency on departures because abandonment is salient', () => {
      const modifiers = applyPersonalityModifiers(
        diplomatProfile.personalityMap,
        createContext([createActorDespawnEvent()]).perception
      );

      expect(modifiers.urgency).toBe('elevated');
      expect(modifiers.contextNotes).toContain('fears abandonment');
    });

    it('gives the brute an avoid social bias during speech because of dismissive attachment', () => {
      const modifiers = applyPersonalityModifiers(
        bruteProfile.personalityMap,
        createContext([buildSpokeEffect({ actorId: 'actor-002', sessionId: 'session-001' })])
          .perception
      );

      expect(modifiers.socialBias).toBe('avoid');
      expect(modifiers.contextNotes).toContain('maintains emotional distance');
    });

    it('keeps the scholar on the social default for avoidant conflict without attachment override', () => {
      const modifiers = applyPersonalityModifiers(
        scholarProfile.personalityMap,
        createContext([buildSpokeEffect({ actorId: 'actor-002', sessionId: 'session-001' })])
          .perception
      );

      expect(modifiers.socialBias).toBe('avoid');
      expect(modifiers.contextNotes).not.toContain('maintains emotional distance');
    });

    it('leaves sparse profiles at default modifiers', () => {
      expect(
        applyPersonalityModifiers(
          sparseProfile.personalityMap,
          createContext([
            createDamagedEvent(),
            buildSpokeEffect({ actorId: 'actor-002', sessionId: 'session-001' }),
            createActorDespawnEvent(),
          ]).perception
        )
      ).toEqual({
        urgency: 'normal',
        socialBias: 'neutral',
        contextNotes: [],
      });
    });
  });

  describe('regression: sparse and partial personality data', () => {
    it('keeps an empty personality map on the pre-enrichment baseline prompt', () => {
      const profile = buildCharacterProfile({
        id: 'char-empty',
        name: 'Empty Map',
        summary: 'A legacy NPC with no structured personality data.',
        backstory: 'Mostly defined by old narrative text.',
        personalityMap: {},
      });

      const prompt = buildNpcCognitionPrompt(
        createContext([
          buildSpokeEffect({
            actorId: 'actor-002',
            sessionId: 'session-001',
            content: 'Still on duty?',
          }),
        ]).perception,
        createNpcState(),
        profile
      );

      expect(prompt).toBe([
        'NPC: Empty Map',
        'Summary: A legacy NPC with no structured personality data.',
        'Backstory: Mostly defined by old narrative text.',
        'Recent events:',
        '- actor-002 said: "Still on duty?"',
        'Instruction: Decide the next thing the NPC should say.',
      ].join('\n'));
    });

    it('keeps an undefined personality map on the same baseline prompt', () => {
      const prompt = buildNpcCognitionPrompt(
        createContext([
          buildSpokeEffect({
            actorId: 'actor-002',
            sessionId: 'session-001',
            content: 'Still on duty?',
          }),
        ]).perception,
        createNpcState(),
        sparseProfile
      );

      expect(prompt).toBe([
        'NPC: Old Guard',
        'Summary: An old guard who has been here for years.',
        'Backstory: Created for testing purposes.',
        'Recent events:',
        '- actor-002 said: "Still on duty?"',
        'Instruction: Decide the next thing the NPC should say.',
      ].join('\n'));
    });

    it('renders only the values section when values are the only structured personality data', async () => {
      const profile = buildCharacterProfile({
        id: 'char-values-only',
        name: 'Values Only',
        summary: 'A pragmatic NPC defined mostly by priorities.',
        backstory: 'Little else about them was ever written down.',
        personalityMap: {
          values: [{ value: 'wisdom', priority: 1 }],
        },
      });

      const { messages } = await captureMessages(profile, [
        buildSpokeEffect({ actorId: 'actor-002', sessionId: 'session-001' }),
      ]);
      const userMessage = getMessageContent(messages, 'user');

      expect(userMessage).toContain('Values: wisdom (paramount)');
      expect(userMessage).not.toContain('Personality:');
      expect(userMessage).not.toContain('Traits:');
      expect(userMessage).not.toContain('Fears:');
      expect(userMessage).not.toContain('Social:');
      expect(userMessage).not.toContain('Speech:');
      expect(userMessage).not.toContain('Emotional baseline:');
      expect(userMessage).not.toContain('Under stress:');
    });

    it('renders speech-only personality data in both user and system prompts', async () => {
      const profile = buildCharacterProfile({
        id: 'char-speech-only',
        name: 'Speech Only',
        summary: 'An NPC whose speech style survived the migration.',
        backstory: 'Notes about attitude were lost, but dialogue patterns remained.',
        personalityMap: {
          speech: {
            vocabulary: 'simple',
            sentenceStructure: 'terse',
            formality: 'casual',
            humor: 'none',
            expressiveness: 'stoic',
            directness: 'blunt',
            pace: 'quick',
          },
        },
      });

      const { messages } = await captureMessages(profile, [
        buildSpokeEffect({ actorId: 'actor-002', sessionId: 'session-001' }),
      ]);
      const systemMessage = getMessageContent(messages, 'system');
      const userMessage = getMessageContent(messages, 'user');

      expect(userMessage).toContain('Speech: simple vocabulary, terse sentences, casual tone');
      expect(systemMessage).toContain('Use simple, everyday words. Avoid complex vocabulary.');
      expect(systemMessage).toContain('Speak casually. Use contractions, slang, and informal grammar.');
    });
  });
});

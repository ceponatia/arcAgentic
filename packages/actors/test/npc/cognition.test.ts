import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Effect } from 'effect';
import type { CharacterProfile, WorldEvent } from '@arcagentic/schemas';

import {
  buildMovedEffect,
  buildSpokeEffect,
} from '../../../../config/vitest/builders/world-event.js';
import { mockLlmProvider } from '../../../../config/vitest/mocks/llm.js';
import { CognitionLayer } from '../../src/npc/cognition.js';
import type { CognitionContext, NpcRuntimeState } from '../../src/npc/types.js';

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

function createContext(events: WorldEvent[], stateOverrides: Partial<NpcRuntimeState> = {}): CognitionContext {
  return {
    perception: {
      relevantEvents: events,
      nearbyActors: [],
    },
    state: createNpcState(stateOverrides),
    availableActions: ['SPEAK_INTENT'],
  };
}

function createProfile(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char-001',
    name: 'Mara',
    summary: 'A guarded sentinel who chooses her words carefully.',
    backstory: 'Mara survived a long border war and now trusts slowly.',
    personalityMap: {
      traits: ['guarded', 'loyal'],
      speech: {
        directness: 'measured',
      },
    },
    ...overrides,
  } as CharacterProfile;
}

describe('CognitionLayer', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('shouldAct', () => {
    it('returns true when perception includes relevant events', () => {
      expect(
        CognitionLayer.shouldAct(createContext([buildSpokeEffect({ actorId: 'actor-002' })]))
      ).toBe(true);
    });

    it('returns false when there are no relevant events', () => {
      expect(CognitionLayer.shouldAct(createContext([]))).toBe(false);
    });
  });

  describe('summarizeDecision', () => {
    it('returns a no-action summary for null decisions', () => {
      expect(CognitionLayer.summarizeDecision(null)).toBe('No action needed');
    });

    it('returns a descriptive summary for an action result', () => {
      const decision = CognitionLayer.decideSync(
        createContext([buildSpokeEffect({ actorId: 'actor-002', sessionId: 'session-001' })])
      );

      expect(CognitionLayer.summarizeDecision(decision)).toBe(
        'Decided to SPEAK_INTENT (delay: 500ms)'
      );
    });
  });

  describe('decideSync', () => {
    it('returns null when no relevant events exist', () => {
      expect(CognitionLayer.decideSync(createContext([]))).toBeNull();
    });

    it('returns a speak intent when a different actor spoke', () => {
      const result = CognitionLayer.decideSync(
        createContext([
          buildSpokeEffect({
            actorId: 'actor-002',
            sessionId: 'session-001',
            content: 'Hello there.',
          }),
        ])
      );

      expect(result).toEqual({
        intent: expect.objectContaining({
          type: 'SPEAK_INTENT',
          actorId: 'npc-001',
          sessionId: 'session-001',
          targetActorId: 'actor-002',
          content: '[NPC npc-001 responding to speech]',
        }),
        delayMs: 500,
      });
    });

    it('returns null when the only speech event came from the npc itself', () => {
      const result = CognitionLayer.decideSync(
        createContext([
          buildSpokeEffect({
            actorId: 'npc-001',
            sessionId: 'session-001',
            content: 'I am speaking to myself.',
          }),
        ])
      );

      expect(result).toBeNull();
    });
  });

  describe('decideLLM', () => {
    it('returns null immediately when there are no relevant events', async () => {
      const llmProvider = mockLlmProvider();

      const result = await CognitionLayer.decideLLM(
        createContext([]),
        createProfile(),
        llmProvider
      );

      expect(result).toBeNull();
      expect(llmProvider.chat).not.toHaveBeenCalled();
    });

    it('returns a speak intent from an llm response', async () => {
      const llmProvider = mockLlmProvider();
      llmProvider.chat.mockReturnValue(
        Effect.succeed({
          id: 'llm-response-001',
          content: 'Let us talk this through calmly.',
          tool_calls: null,
          usage: null,
        })
      );

      const result = await CognitionLayer.decideLLM(
        createContext([buildSpokeEffect({ actorId: 'actor-002', sessionId: 'session-001' })]),
        createProfile(),
        llmProvider
      );

      expect(llmProvider.chat).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        intent: expect.objectContaining({
          type: 'SPEAK_INTENT',
          actorId: 'npc-001',
          sessionId: 'session-001',
          content: 'Let us talk this through calmly.',
        }),
        delayMs: 300,
      });
    });

    it('falls back to decideSync when the llm returns NO_ACTION', async () => {
      const llmProvider = mockLlmProvider();
      llmProvider.chat.mockReturnValue(
        Effect.succeed({
          id: 'llm-response-002',
          content: 'no_action',
          tool_calls: null,
          usage: null,
        })
      );

      const result = await CognitionLayer.decideLLM(
        createContext([buildSpokeEffect({ actorId: 'actor-002', sessionId: 'session-001' })]),
        createProfile(),
        llmProvider
      );

      expect(result).toEqual({
        intent: expect.objectContaining({
          type: 'SPEAK_INTENT',
          actorId: 'npc-001',
          targetActorId: 'actor-002',
          content: '[NPC npc-001 responding to speech]',
        }),
        delayMs: 500,
      });
    });

    it('returns null when the llm says NO_ACTION and the sync fallback also returns null', async () => {
      const llmProvider = mockLlmProvider();
      llmProvider.chat.mockReturnValue(
        Effect.succeed({
          id: 'llm-response-003',
          content: 'NO_ACTION',
          tool_calls: null,
          usage: null,
        })
      );

      const result = await CognitionLayer.decideLLM(
        createContext([
          buildMovedEffect({
            actorId: 'actor-002',
            sessionId: 'session-001',
            fromLocationId: 'loc-999',
            toLocationId: 'loc-001',
          }),
        ]),
        createProfile(),
        llmProvider
      );

      expect(result).toBeNull();
    });

    it('falls back to decideSync when the llm provider fails', async () => {
      const llmProvider = mockLlmProvider();
      llmProvider.chat.mockReturnValue(Effect.fail(new Error('provider offline')));

      const result = await CognitionLayer.decideLLM(
        createContext([buildSpokeEffect({ actorId: 'actor-002', sessionId: 'session-001' })]),
        createProfile(),
        llmProvider
      );

      expect(result).toEqual({
        intent: expect.objectContaining({
          type: 'SPEAK_INTENT',
          actorId: 'npc-001',
          targetActorId: 'actor-002',
        }),
        delayMs: 500,
      });
    });

    it('returns null when the llm fails and the sync fallback has no action', async () => {
      const llmProvider = mockLlmProvider();
      llmProvider.chat.mockReturnValue(Effect.fail(new Error('provider offline')));

      const result = await CognitionLayer.decideLLM(
        createContext([
          buildMovedEffect({
            actorId: 'actor-002',
            sessionId: 'session-001',
            fromLocationId: 'loc-999',
            toLocationId: 'loc-001',
          }),
        ]),
        createProfile(),
        llmProvider
      );

      expect(result).toBeNull();
    });

    it('falls back to decideSync when the llm call times out', async () => {
      vi.useFakeTimers();

      const llmProvider = mockLlmProvider();
      llmProvider.chat.mockReturnValue(Effect.promise(() => new Promise(() => { })));

      const decisionPromise = CognitionLayer.decideLLM(
        createContext([buildSpokeEffect({ actorId: 'actor-002', sessionId: 'session-001' })]),
        createProfile(),
        llmProvider
      );

      await vi.advanceTimersByTimeAsync(2001);

      await expect(decisionPromise).resolves.toEqual({
        intent: expect.objectContaining({
          type: 'SPEAK_INTENT',
          actorId: 'npc-001',
          targetActorId: 'actor-002',
        }),
        delayMs: 500,
      });
    });
  });
});

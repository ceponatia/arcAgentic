import { describe, expect, it } from 'vitest';
import type { WorldEvent } from '@arcagentic/schemas';

import { classifyEventForNpc, evaluateEngagement } from '../../src/npc/engagement.js';

function createSpokeEvent(overrides: Partial<WorldEvent> = {}): WorldEvent {
  return {
    type: 'SPOKE',
    actorId: 'player:test',
    sessionId: 'session-001',
    content: 'Hello there.',
    timestamp: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  } as WorldEvent;
}

describe('classifyEventForNpc', () => {
  it('classifies targeted player speech as direct', () => {
    const result = classifyEventForNpc(
      createSpokeEvent({ targetActorId: 'npc-001' } as Partial<WorldEvent>),
      'npc-001',
      'loc-001',
      'near'
    );

    expect(result).toBe('direct');
  });

  it('classifies distant untargeted player speech as ambient', () => {
    const result = classifyEventForNpc(createSpokeEvent(), 'npc-001', 'loc-001', 'distant');

    expect(result).toBe('ambient');
  });
});

describe('evaluateEngagement', () => {
  it('allows direct address when the npc is interruptible', () => {
    const decision = evaluateEngagement(
      [
        {
          event: createSpokeEvent({ targetActorId: 'npc-001' } as Partial<WorldEvent>),
          addressType: 'direct',
        },
      ],
      {
        interruptible: true,
      }
    );

    expect(decision).toEqual({
      shouldAct: true,
      reason: 'Directly addressed by player',
    });
  });

  it('skips overheard speech when the npc is absorbed', () => {
    const decision = evaluateEngagement(
      [
        {
          event: createSpokeEvent(),
          addressType: 'overheard',
        },
      ],
      {
        currentActivity: {
          type: 'reading',
          description: 'reading a worn journal',
          engagement: 'absorbed',
        },
        interruptible: true,
      }
    );

    expect(decision).toEqual({
      shouldAct: false,
      reason: 'Absorbed in reading a worn journal',
      continuationHint: 'reading a worn journal',
    });
  });
});
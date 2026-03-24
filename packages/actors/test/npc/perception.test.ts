import { describe, expect, it } from 'vitest';
import type { WorldEvent } from '@arcagentic/schemas';

import {
  buildMovedEffect,
  buildSessionStartEvent,
  buildSpokeEffect,
  buildTickEvent,
} from '../../../../config/vitest/builders/world-event.js';
import { PerceptionLayer } from '../../src/npc/perception.js';
import type { NpcRuntimeState } from '../../src/npc/types.js';

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

describe('PerceptionLayer.filterRelevantEvents', () => {
  it('filters events matching the npc session and location', () => {
    const state = createNpcState();
    const events: WorldEvent[] = [
      buildMovedEffect({
        actorId: 'actor-002',
        sessionId: state.sessionId,
        fromLocationId: 'loc-999',
        toLocationId: state.locationId,
      }),
    ];

    expect(PerceptionLayer.filterRelevantEvents(events, state)).toEqual(events);
  });

  it('includes tick events regardless of location', () => {
    const state = createNpcState();
    const tickEvent = buildTickEvent({ sessionId: state.sessionId, tick: 7 });

    expect(PerceptionLayer.filterRelevantEvents([tickEvent], state)).toEqual([tickEvent]);
  });

  it('includes session-level events regardless of location fields', () => {
    const state = createNpcState();
    const sessionStart = buildSessionStartEvent({ sessionId: state.sessionId });

    expect(PerceptionLayer.filterRelevantEvents([sessionStart], state)).toEqual([sessionStart]);
  });

  it('includes events targeted at the npc actor id', () => {
    const state = createNpcState();
    const targetedSpeech = buildSpokeEffect({
      sessionId: state.sessionId,
      actorId: 'actor-002',
      targetActorId: state.id,
    });

    expect(PerceptionLayer.filterRelevantEvents([targetedSpeech], state)).toEqual([
      targetedSpeech,
    ]);
  });

  it('excludes events from a different session', () => {
    const state = createNpcState();
    const otherSessionEvent = buildMovedEffect({
      sessionId: 'session-999',
      fromLocationId: 'loc-999',
      toLocationId: state.locationId,
    });

    expect(PerceptionLayer.filterRelevantEvents([otherSessionEvent], state)).toEqual([]);
  });

  it('excludes non-tick location events happening elsewhere', () => {
    const state = createNpcState();
    const otherLocationEvent = buildMovedEffect({
      sessionId: state.sessionId,
      fromLocationId: 'loc-777',
      toLocationId: 'loc-999',
    });

    expect(PerceptionLayer.filterRelevantEvents([otherLocationEvent], state)).toEqual([]);
  });

  it('returns an empty array when no events are relevant', () => {
    const state = createNpcState();
    const events: WorldEvent[] = [
      buildMovedEffect({
        sessionId: 'session-999',
        fromLocationId: 'loc-777',
        toLocationId: 'loc-999',
      }),
      buildSpokeEffect({
        sessionId: state.sessionId,
        actorId: 'actor-002',
        targetActorId: 'actor-999',
      }),
    ];

    expect(PerceptionLayer.filterRelevantEvents(events, state)).toEqual([]);
  });
});

describe('PerceptionLayer.isRelevant', () => {
  it('returns true for a moved event into the npc location', () => {
    const state = createNpcState();
    const event = buildMovedEffect({
      sessionId: state.sessionId,
      fromLocationId: 'loc-999',
      toLocationId: state.locationId,
    });

    expect(PerceptionLayer.isRelevant(event, state)).toBe(true);
  });

  it('returns true for a tick event in the same session', () => {
    const state = createNpcState();

    expect(
      PerceptionLayer.isRelevant(
        buildTickEvent({ sessionId: state.sessionId, tick: 3 }),
        state
      )
    ).toBe(true);
  });

  it('returns true for a speech event targeted at the npc', () => {
    const state = createNpcState();

    expect(
      PerceptionLayer.isRelevant(
        buildSpokeEffect({
          sessionId: state.sessionId,
          actorId: 'actor-002',
          targetActorId: state.id,
        }),
        state
      )
    ).toBe(true);
  });

  it('returns false when the event target actor does not match the npc', () => {
    const state = createNpcState();

    expect(
      PerceptionLayer.isRelevant(
        buildSpokeEffect({
          sessionId: state.sessionId,
          actorId: 'actor-002',
          targetActorId: 'actor-999',
        }),
        state
      )
    ).toBe(false);
  });

  it('returns false when the event session does not match the npc session', () => {
    const state = createNpcState();

    expect(
      PerceptionLayer.isRelevant(
        buildTickEvent({ sessionId: 'session-999', tick: 1 }),
        state
      )
    ).toBe(false);
  });
});

describe('PerceptionLayer.buildContext', () => {
  it('extracts nearby actors from moved events entering the npc location', () => {
    const state = createNpcState();
    const events: WorldEvent[] = [
      buildMovedEffect({
        actorId: 'actor-002',
        sessionId: state.sessionId,
        fromLocationId: 'loc-999',
        toLocationId: state.locationId,
      }),
      buildMovedEffect({
        actorId: 'actor-003',
        sessionId: state.sessionId,
        fromLocationId: 'loc-777',
        toLocationId: state.locationId,
      }),
    ];

    const context = PerceptionLayer.buildContext(events, state);

    expect(context.nearbyActors).toEqual(['actor-002', 'actor-003']);
  });

  it('ignores moved events that do not end in the npc location', () => {
    const state = createNpcState();
    const events: WorldEvent[] = [
      buildMovedEffect({
        actorId: 'actor-002',
        sessionId: state.sessionId,
        fromLocationId: state.locationId,
        toLocationId: 'loc-999',
      }),
    ];

    const context = PerceptionLayer.buildContext(events, state);

    expect(context.nearbyActors).toEqual([]);
  });

  it('returns both relevant events and nearby actors in the context structure', () => {
    const state = createNpcState();
    const moved = buildMovedEffect({
      actorId: 'actor-002',
      sessionId: state.sessionId,
      fromLocationId: 'loc-999',
      toLocationId: state.locationId,
    });
    const tick = buildTickEvent({ sessionId: state.sessionId, tick: 9 });

    const context = PerceptionLayer.buildContext([moved, tick], state);

    expect(context).toEqual({
      relevantEvents: [moved, tick],
      nearbyActors: ['actor-002'],
    });
  });
});

describe('PerceptionLayer.summarize', () => {
  it('returns a descriptive summary string', () => {
    const summary = PerceptionLayer.summarize({
      relevantEvents: [
        buildTickEvent({ sessionId: 'session-001', tick: 1 }),
        buildSpokeEffect({ sessionId: 'session-001', actorId: 'actor-002' }),
      ],
      nearbyActors: ['actor-002'],
    });

    expect(summary).toBe('Perceived 2 events: TICK, SPOKE. Nearby: 1 actors.');
  });
});

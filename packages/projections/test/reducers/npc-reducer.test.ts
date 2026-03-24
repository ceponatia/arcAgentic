import { describe, expect, it } from 'vitest';
import {
  DEFAULT_START_TIME,
  createDefaultNpcLocationState,
  type WorldEvent,
} from '@arcagentic/schemas';
import {
  buildActorSpawnEvent,
  buildMovedEffect,
  buildSpeakIntent,
} from '../../../../config/vitest/builders/world-event.js';
import {
  initialNpcsState,
  type NpcState,
  type NpcsState,
  npcReducer,
} from '../../src/reducers/npc.js';

type ActorDespawnEvent = Extract<WorldEvent, { type: 'ACTOR_DESPAWN' }>;
type DamagedEvent = Extract<WorldEvent, { type: 'DAMAGED' }>;
type HealedEvent = Extract<WorldEvent, { type: 'HEALED' }>;
type DiedEvent = Extract<WorldEvent, { type: 'DIED' }>;
type ItemAcquiredEvent = Extract<WorldEvent, { type: 'ITEM_ACQUIRED' }>;
type ItemDroppedEvent = Extract<WorldEvent, { type: 'ITEM_DROPPED' }>;

function buildActorDespawnEvent(
  overrides: Partial<ActorDespawnEvent> = {}
): ActorDespawnEvent {
  return {
    type: 'ACTOR_DESPAWN',
    actorId: 'actor-test-001',
    sessionId: 'session-test-001',
    timestamp: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

function buildDamagedEvent(
  overrides: Partial<DamagedEvent> = {}
): DamagedEvent {
  return {
    type: 'DAMAGED',
    actorId: 'actor-test-001',
    amount: 5,
    sessionId: 'session-test-001',
    timestamp: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

function buildHealedEvent(
  overrides: Partial<HealedEvent> = {}
): HealedEvent {
  return {
    type: 'HEALED',
    actorId: 'actor-test-001',
    amount: 5,
    sessionId: 'session-test-001',
    timestamp: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

function buildDiedEvent(overrides: Partial<DiedEvent> = {}): DiedEvent {
  return {
    type: 'DIED',
    actorId: 'actor-test-001',
    sessionId: 'session-test-001',
    timestamp: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

function buildItemAcquiredEvent(
  overrides: Partial<ItemAcquiredEvent> = {}
): ItemAcquiredEvent {
  return {
    type: 'ITEM_ACQUIRED',
    actorId: 'actor-test-001',
    itemId: 'item-test-001',
    sessionId: 'session-test-001',
    timestamp: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

function buildItemDroppedEvent(
  overrides: Partial<ItemDroppedEvent> = {}
): ItemDroppedEvent {
  return {
    type: 'ITEM_DROPPED',
    actorId: 'actor-test-001',
    itemId: 'item-test-001',
    sessionId: 'session-test-001',
    timestamp: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

function buildNpcsState(npcs: Record<string, Partial<NpcState>> = {}): NpcsState {
  return Object.fromEntries(
    Object.entries(npcs).map(([npcId, npc]) => {
      const locationId = npc.location?.locationId ?? 'loc-001';

      return [
        npcId,
        {
          id: npc.id ?? npcId,
          location: npc.location ?? createDefaultNpcLocationState(locationId, DEFAULT_START_TIME),
          health: npc.health ?? { current: 100, max: 100 },
          status: npc.status ?? 'alive',
          inventory: npc.inventory ?? [],
        },
      ];
    })
  );
}

describe('npcReducer', () => {
  it('starts with an empty npc state map', () => {
    expect(initialNpcsState).toEqual({});
  });

  it('creates default NPC state for npc ACTOR_SPAWN events', () => {
    const result = npcReducer(initialNpcsState, buildActorSpawnEvent());

    expect(result['actor-test-001']).toEqual({
      id: 'actor-test-001',
      location: createDefaultNpcLocationState('loc-001', DEFAULT_START_TIME),
      health: { current: 100, max: 100 },
      status: 'alive',
      inventory: [],
    });
  });

  it('ignores ACTOR_SPAWN events for player actors', () => {
    const result = npcReducer(
      initialNpcsState,
      buildActorSpawnEvent({ actorType: 'player' })
    );

    expect(result).toBe(initialNpcsState);
  });

  it('removes despawned NPCs from state', () => {
    const state = buildNpcsState({
      'actor-test-001': {},
      'actor-test-002': {},
    });

    const result = npcReducer(state, buildActorDespawnEvent({ actorId: 'actor-test-001' }));

    expect(result).toEqual(buildNpcsState({ 'actor-test-002': {} }));
  });

  it('leaves state unchanged when despawning an unknown NPC', () => {
    const state = buildNpcsState({ 'actor-test-001': {} });

    const result = npcReducer(state, buildActorDespawnEvent({ actorId: 'actor-test-999' }));

    expect(result).toEqual(state);
  });

  it('updates NPC location on MOVED', () => {
    const state = buildNpcsState({
      'actor-test-001': {
        location: createDefaultNpcLocationState('loc-001', DEFAULT_START_TIME),
      },
    });

    const result = npcReducer(
      state,
      buildMovedEffect({ actorId: 'actor-test-001', toLocationId: 'loc-002' })
    );

    expect(result['actor-test-001']?.location.locationId).toBe('loc-002');
  });

  it('returns the same state object when MOVED targets an unknown NPC', () => {
    const state = buildNpcsState({ 'actor-test-001': {} });

    const result = npcReducer(
      state,
      buildMovedEffect({ actorId: 'actor-test-999', toLocationId: 'loc-002' })
    );

    expect(result).toBe(state);
  });

  it('reduces health when DAMAGED is applied', () => {
    const state = buildNpcsState({
      'actor-test-001': { health: { current: 90, max: 100 } },
    });

    const result = npcReducer(state, buildDamagedEvent({ amount: 15 }));

    expect(result['actor-test-001']?.health).toEqual({ current: 75, max: 100 });
  });

  it('clamps health at zero when damage exceeds current health', () => {
    const state = buildNpcsState({
      'actor-test-001': { health: { current: 10, max: 100 } },
    });

    const result = npcReducer(state, buildDamagedEvent({ amount: 50 }));

    expect(result['actor-test-001']?.health.current).toBe(0);
  });

  it('increases health when HEALED is applied', () => {
    const state = buildNpcsState({
      'actor-test-001': { health: { current: 40, max: 100 } },
    });

    const result = npcReducer(state, buildHealedEvent({ amount: 15 }));

    expect(result['actor-test-001']?.health).toEqual({ current: 55, max: 100 });
  });

  it('clamps health at max when healing exceeds the cap', () => {
    const state = buildNpcsState({
      'actor-test-001': { health: { current: 95, max: 100 } },
    });

    const result = npcReducer(state, buildHealedEvent({ amount: 50 }));

    expect(result['actor-test-001']?.health.current).toBe(100);
  });

  it('marks the NPC dead and zeroes health on DIED', () => {
    const state = buildNpcsState({
      'actor-test-001': { health: { current: 45, max: 100 }, status: 'alive' },
    });

    const result = npcReducer(state, buildDiedEvent());

    expect(result['actor-test-001']).toMatchObject({
      status: 'dead',
      health: { current: 0, max: 100 },
    });
  });

  it('adds acquired items to npc inventory', () => {
    const state = buildNpcsState({
      'actor-test-001': { inventory: ['item-test-000'] },
    });

    const result = npcReducer(state, buildItemAcquiredEvent());

    expect(result['actor-test-001']?.inventory).toEqual([
      'item-test-000',
      'item-test-001',
    ]);
  });

  it('removes dropped items from npc inventory', () => {
    const state = buildNpcsState({
      'actor-test-001': { inventory: ['item-test-001', 'item-test-002'] },
    });

    const result = npcReducer(state, buildItemDroppedEvent({ itemId: 'item-test-001' }));

    expect(result['actor-test-001']?.inventory).toEqual(['item-test-002']);
  });

  it('handles a spawn, damage, heal, and die chain', () => {
    const spawnedState = npcReducer(
      initialNpcsState,
      buildActorSpawnEvent({ actorId: 'actor-test-001', locationId: 'loc-001' })
    );
    const damagedState = npcReducer(
      spawnedState,
      buildDamagedEvent({ actorId: 'actor-test-001', amount: 30 })
    );
    const healedState = npcReducer(
      damagedState,
      buildHealedEvent({ actorId: 'actor-test-001', amount: 10 })
    );
    const result = npcReducer(healedState, buildDiedEvent({ actorId: 'actor-test-001' }));

    expect(result['actor-test-001']).toMatchObject({
      status: 'dead',
      health: { current: 0, max: 100 },
    });
  });

  it('returns the same state object for unrelated events', () => {
    const state = buildNpcsState({ 'actor-test-001': {} });
    const result = npcReducer(state, buildSpeakIntent());

    expect(result).toBe(state);
  });
});

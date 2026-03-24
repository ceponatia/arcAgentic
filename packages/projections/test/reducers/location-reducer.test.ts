import { describe, expect, it } from 'vitest';
import type { WorldEvent } from '@arcagentic/schemas';
import {
  buildActorSpawnEvent,
  buildMovedEffect,
  buildSpeakIntent,
} from '../../../../config/vitest/builders/world-event.js';
import {
  initialLocationsState,
  type LocationState,
  type LocationsState,
  locationReducer,
} from '../../src/reducers/location.js';

type ActorDespawnEvent = Extract<WorldEvent, { type: 'ACTOR_DESPAWN' }>;
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

function buildLocationsState(
  locations: Record<string, Partial<LocationState>> = {}
): LocationsState {
  return Object.fromEntries(
    Object.entries(locations).map(([locationId, location]) => [
      locationId,
      {
        id: location.id ?? locationId,
        actors: location.actors ?? [],
        items: location.items ?? [],
      },
    ])
  );
}

describe('locationReducer', () => {
  it('starts with an empty locations state', () => {
    expect(initialLocationsState).toEqual({});
  });

  it('adds a spawned actor to a new location entry', () => {
    const result = locationReducer(initialLocationsState, buildActorSpawnEvent());

    expect(result).toEqual({
      'loc-001': { id: 'loc-001', actors: ['actor-test-001'], items: [] },
    });
  });

  it('deduplicates repeated ACTOR_SPAWN events for the same actor', () => {
    const firstState = locationReducer(initialLocationsState, buildActorSpawnEvent());
    const result = locationReducer(firstState, buildActorSpawnEvent());

    expect(result['loc-001']?.actors).toEqual(['actor-test-001']);
  });

  it('supports multiple actors in the same location', () => {
    const firstState = locationReducer(initialLocationsState, buildActorSpawnEvent());
    const result = locationReducer(
      firstState,
      buildActorSpawnEvent({ actorId: 'actor-test-002' })
    );

    expect(result['loc-001']?.actors).toEqual(['actor-test-001', 'actor-test-002']);
  });

  it('removes a despawned actor from every location', () => {
    const state = buildLocationsState({
      'loc-001': { actors: ['actor-test-001', 'actor-test-002'] },
      'loc-002': { actors: ['actor-test-001'] },
    });

    const result = locationReducer(
      state,
      buildActorDespawnEvent({ actorId: 'actor-test-001' })
    );

    expect(result['loc-001']?.actors).toEqual(['actor-test-002']);
    expect(result['loc-002']?.actors).toEqual([]);
  });

  it('leaves location memberships untouched when despawning an unknown actor', () => {
    const state = buildLocationsState({
      'loc-001': { actors: ['actor-test-001'] },
    });

    const result = locationReducer(
      state,
      buildActorDespawnEvent({ actorId: 'actor-test-999' })
    );

    expect(result).toEqual(state);
  });

  it('moves an actor from one location to another', () => {
    const state = buildLocationsState({
      'loc-001': { actors: ['actor-test-001'] },
      'loc-002': { actors: [] },
    });

    const result = locationReducer(
      state,
      buildMovedEffect({
        actorId: 'actor-test-001',
        fromLocationId: 'loc-001',
        toLocationId: 'loc-002',
      })
    );

    expect(result['loc-001']?.actors).toEqual([]);
    expect(result['loc-002']?.actors).toEqual(['actor-test-001']);
  });

  it('creates the destination location when MOVED targets a missing location', () => {
    const state = buildLocationsState({
      'loc-001': { actors: ['actor-test-001'] },
    });

    const result = locationReducer(
      state,
      buildMovedEffect({
        actorId: 'actor-test-001',
        fromLocationId: 'loc-001',
        toLocationId: 'loc-999',
      })
    );

    expect(result['loc-999']).toEqual({
      id: 'loc-999',
      actors: ['actor-test-001'],
      items: [],
    });
  });

  it('gracefully handles MOVED when the from-location is unknown', () => {
    const state = buildLocationsState({
      'loc-002': { actors: [] },
    });

    const result = locationReducer(
      state,
      buildMovedEffect({
        actorId: 'actor-test-001',
        fromLocationId: 'loc-missing',
        toLocationId: 'loc-002',
      })
    );

    expect(result['loc-002']?.actors).toEqual(['actor-test-001']);
  });

  it('deduplicates the actor in the destination location during MOVED', () => {
    const state = buildLocationsState({
      'loc-001': { actors: ['actor-test-001'] },
      'loc-002': { actors: ['actor-test-001'] },
    });

    const result = locationReducer(
      state,
      buildMovedEffect({
        actorId: 'actor-test-001',
        fromLocationId: 'loc-001',
        toLocationId: 'loc-002',
      })
    );

    expect(result['loc-002']?.actors).toEqual(['actor-test-001']);
  });

  it('removes an acquired item from every location', () => {
    const state = buildLocationsState({
      'loc-001': { items: ['item-test-001', 'item-test-002'] },
      'loc-002': { items: ['item-test-001'] },
    });

    const result = locationReducer(state, buildItemAcquiredEvent());

    expect(result['loc-001']?.items).toEqual(['item-test-002']);
    expect(result['loc-002']?.items).toEqual([]);
  });

  it('leaves items untouched when ITEM_ACQUIRED targets an unknown item', () => {
    const state = buildLocationsState({
      'loc-001': { items: ['item-test-001'] },
    });

    const result = locationReducer(
      state,
      buildItemAcquiredEvent({ itemId: 'item-test-999' })
    );

    expect(result).toEqual(state);
  });

  it('drops an item into the actor current location', () => {
    const state = buildLocationsState({
      'loc-001': { actors: ['actor-test-001'], items: [] },
      'loc-002': { actors: [], items: [] },
    });

    const result = locationReducer(state, buildItemDroppedEvent());

    expect(result['loc-001']?.items).toEqual(['item-test-001']);
    expect(result['loc-002']?.items).toEqual([]);
  });

  it('deduplicates repeated ITEM_DROPPED events for the same item', () => {
    const state = buildLocationsState({
      'loc-001': { actors: ['actor-test-001'], items: ['item-test-001'] },
    });

    const result = locationReducer(state, buildItemDroppedEvent());

    expect(result['loc-001']?.items).toEqual(['item-test-001']);
  });

  it('returns the same state when dropping an item for an actor with no location', () => {
    const state = buildLocationsState({
      'loc-001': { actors: ['actor-test-002'], items: [] },
    });

    const result = locationReducer(state, buildItemDroppedEvent());

    expect(result).toBe(state);
  });

  it('handles a spawn, move twice, and despawn chain', () => {
    const spawnedState = locationReducer(
      initialLocationsState,
      buildActorSpawnEvent({ actorId: 'actor-test-001', locationId: 'loc-001' })
    );
    const firstMoveState = locationReducer(
      spawnedState,
      buildMovedEffect({
        actorId: 'actor-test-001',
        fromLocationId: 'loc-001',
        toLocationId: 'loc-002',
      })
    );
    const secondMoveState = locationReducer(
      firstMoveState,
      buildMovedEffect({
        actorId: 'actor-test-001',
        fromLocationId: 'loc-002',
        toLocationId: 'loc-003',
      })
    );
    const result = locationReducer(
      secondMoveState,
      buildActorDespawnEvent({ actorId: 'actor-test-001' })
    );

    expect(result['loc-001']?.actors).toEqual([]);
    expect(result['loc-002']?.actors).toEqual([]);
    expect(result['loc-003']?.actors).toEqual([]);
  });

  it('returns the same state object for unrelated events', () => {
    const state = buildLocationsState({
      'loc-001': { actors: ['actor-test-001'], items: ['item-test-001'] },
    });

    const result = locationReducer(state, buildSpeakIntent());

    expect(result).toBe(state);
  });
});

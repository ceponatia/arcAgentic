import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const busModule = vi.hoisted(() => ({
  emit: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn().mockResolvedValue(undefined),
  unsubscribe: vi.fn(),
}));

vi.mock('@arcagentic/bus', () => ({
  worldBus: {
    emit: busModule.emit,
    subscribe: busModule.subscribe,
    unsubscribe: busModule.unsubscribe,
  },
}));

import { ActorRegistry } from '../../src/registry/actor-registry.js';
import { NpcActor } from '../../src/npc/npc-actor.js';
import { PlayerActor } from '../../src/player/player-actor.js';

function createNpcConfig(overrides: Partial<Parameters<ActorRegistry['spawn']>[0]> = {}) {
  return {
    id: 'npc-actor-001',
    type: 'npc' as const,
    npcId: 'npc-001',
    sessionId: 'session-001',
    locationId: 'loc-001',
    ...overrides,
  };
}

function createPlayerConfig(overrides: Partial<Parameters<ActorRegistry['spawn']>[0]> = {}) {
  return {
    id: 'player-actor-001',
    type: 'player' as const,
    sessionId: 'session-001',
    locationId: 'loc-001',
    ...overrides,
  };
}

describe('ActorRegistry', () => {
  let registry: ActorRegistry;

  beforeEach(() => {
    busModule.emit.mockClear();
    busModule.subscribe.mockClear();
    busModule.unsubscribe.mockClear();
    registry = new ActorRegistry();
  });

  afterEach(() => {
    for (const actor of registry.getAll()) {
      actor.stop();
    }
  });

  describe('spawn', () => {
    it('creates an npc actor when type is npc', () => {
      const actor = registry.spawn(createNpcConfig());

      expect(actor).toBeInstanceOf(NpcActor);
      expect(actor.type).toBe('npc');
    });

    it('creates a player actor when type is player', () => {
      const actor = registry.spawn(createPlayerConfig());

      expect(actor).toBeInstanceOf(PlayerActor);
      expect(actor.type).toBe('player');
    });

    it('throws for unknown actor types', () => {
      expect(() =>
        registry.spawn({
          id: 'system-actor-001',
          type: 'system',
          sessionId: 'session-001',
          locationId: 'loc-001',
        })
      ).toThrow('Unknown actor type: system');
    });

    it('throws for duplicate actor ids', () => {
      registry.spawn(createNpcConfig());

      expect(() => registry.spawn(createNpcConfig())).toThrow('Actor npc-actor-001 already exists');
    });

    it('throws when an npc is missing npcId', () => {
      expect(() =>
        registry.spawn({
          id: 'npc-actor-001',
          type: 'npc',
          sessionId: 'session-001',
          locationId: 'loc-001',
        })
      ).toThrow('npcId required for NPC actors');
    });

    it('emits an ACTOR_SPAWN event to the world bus', () => {
      registry.spawn(createNpcConfig());

      expect(busModule.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ACTOR_SPAWN',
          actorId: 'npc-actor-001',
          actorType: 'npc',
          sessionId: 'session-001',
          locationId: 'loc-001',
        })
      );
    });

    it('tracks spawned actors in the registry', () => {
      const actor = registry.spawn(createNpcConfig());

      expect(registry.get(actor.id)).toBe(actor);
      expect(registry.has(actor.id)).toBe(true);
      expect(registry.count()).toBe(1);
    });
  });

  describe('lookup', () => {
    it('returns a spawned actor and undefined for unknown ids', () => {
      const actor = registry.spawn(createNpcConfig());

      expect(registry.get(actor.id)).toBe(actor);
      expect(registry.get('missing-actor')).toBeUndefined();
    });

    it('returns actors for a session', () => {
      const npc = registry.spawn(createNpcConfig());
      const player = registry.spawn(
        createPlayerConfig({ id: 'player-actor-002', sessionId: 'session-001' })
      );
      registry.spawn(createNpcConfig({ id: 'npc-actor-003', sessionId: 'session-002' }));

      expect(registry.getForSession('session-001')).toEqual([npc, player]);
    });

    it('returns an empty array for unknown sessions', () => {
      expect(registry.getForSession('missing-session')).toEqual([]);
    });

    it('returns all actors', () => {
      const npc = registry.spawn(createNpcConfig());
      const player = registry.spawn(createPlayerConfig());

      expect(registry.getAll()).toEqual([npc, player]);
    });

    it('returns the active actor count', () => {
      registry.spawn(createNpcConfig());
      registry.spawn(createPlayerConfig());

      expect(registry.count()).toBe(2);
    });

    it('reports whether an actor exists', () => {
      registry.spawn(createNpcConfig());

      expect(registry.has('npc-actor-001')).toBe(true);
      expect(registry.has('missing-actor')).toBe(false);
    });
  });

  describe('despawn', () => {
    it('removes an actor from the registry', () => {
      registry.spawn(createNpcConfig());

      registry.despawn('npc-actor-001');

      expect(registry.has('npc-actor-001')).toBe(false);
      expect(registry.count()).toBe(0);
    });

    it('emits an ACTOR_DESPAWN event to the world bus', () => {
      registry.spawn(createNpcConfig());
      busModule.emit.mockClear();

      registry.despawn('npc-actor-001');

      expect(busModule.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ACTOR_DESPAWN',
          actorId: 'npc-actor-001',
          sessionId: 'session-001',
        })
      );
    });

    it('throws when despawning an unknown actor', () => {
      expect(() => registry.despawn('missing-actor')).toThrow('Actor missing-actor not found');
    });

    it('despawns all actors for a session', () => {
      registry.spawn(createNpcConfig());
      registry.spawn(createPlayerConfig({ id: 'player-actor-002', sessionId: 'session-001' }));
      registry.spawn(createNpcConfig({ id: 'npc-actor-003', sessionId: 'session-002' }));

      registry.despawnSession('session-001');

      expect(registry.has('npc-actor-001')).toBe(false);
      expect(registry.has('player-actor-002')).toBe(false);
      expect(registry.has('npc-actor-003')).toBe(true);
      expect(registry.getForSession('session-001')).toEqual([]);
      expect(registry.count()).toBe(1);
    });
  });
});

import {
  createDefaultNpcLocationState,
  type GameTime,
  type NpcLocationState,
} from '@arcagentic/schemas';
import type {
  LocationState,
  LocationsState,
  NpcState,
  NpcsState,
  SessionState,
} from '@arcagentic/projections';

const DEFAULT_GAME_TIME: GameTime = {
  year: 1,
  month: 1,
  dayOfMonth: 1,
  absoluteDay: 1,
  hour: 12,
  minute: 0,
  second: 0,
};

function buildNpcLocation(locationId: string, location?: NpcLocationState): NpcLocationState {
  return location ?? createDefaultNpcLocationState(locationId, DEFAULT_GAME_TIME);
}

export function buildSessionState(
  overrides: Partial<SessionState> = {}
): SessionState {
  return {
    status: 'active',
    currentTick: 0,
    ...overrides,
  };
}

export function buildLocationsState(
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

export function buildNpcsState(
  npcs: Record<string, Partial<NpcState>> = {}
): NpcsState {
  return Object.fromEntries(
    Object.entries(npcs).map(([npcId, npc]) => {
      const locationId = npc.location?.locationId ?? 'loc-001';

      return [
        npcId,
        {
          id: npc.id ?? npcId,
          location: buildNpcLocation(locationId, npc.location),
          health: npc.health ?? { current: 100, max: 100 },
          status: npc.status ?? 'alive',
          inventory: npc.inventory ?? [],
        },
      ];
    })
  );
}

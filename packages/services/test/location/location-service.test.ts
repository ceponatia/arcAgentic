import { describe, expect, it } from 'vitest';

import { LocationMapSchema, type LocationMap } from '@arcagentic/schemas';

import { LocationService } from '../../src/location/location-service.js';

const map: LocationMap = LocationMapSchema.parse({
  id: 'map-1',
  name: 'Test Map',
  settingId: 'setting-1',
  isTemplate: false,
  defaultStartLocationId: 'square',
  nodes: [
    {
      id: 'district',
      name: 'Market District',
      type: 'region',
      parentId: null,
      depth: 0,
      summary: 'A busy district at the heart of town.',
      description: 'A trading district filled with shops, streets, and public squares.',
      ports: [],
    },
    {
      id: 'square',
      name: 'Town Square',
      type: 'room',
      parentId: 'district',
      depth: 1,
      summary: 'A broad cobbled plaza.',
      description: 'Stalls ring the plaza and a fountain marks the center.',
      ports: [
        { id: 'square-east', name: 'East Road', direction: 'east' },
        { id: 'square-south', name: 'South Alley', direction: 'south' },
      ],
      properties: { capacity: 12 },
    },
    {
      id: 'tavern',
      name: 'The Rusty Cup',
      type: 'building',
      parentId: 'district',
      depth: 1,
      summary: 'A weathered tavern.',
      description: 'The smell of ale hangs in the air.',
      ports: [
        { id: 'tavern-west', name: 'Main Door', direction: 'west' },
        { id: 'tavern-down', name: 'Cellar Stairs', direction: 'down' },
      ],
    },
    {
      id: 'alley',
      name: 'Back Alley',
      type: 'room',
      parentId: 'district',
      depth: 1,
      summary: 'A narrow service lane.',
      description: 'Broken crates and damp stone line the walls.',
      ports: [
        { id: 'alley-north', name: 'North End', direction: 'north' },
        { id: 'alley-east', name: 'Service Gate', direction: 'east' },
      ],
    },
    {
      id: 'cellar',
      name: 'Wine Cellar',
      type: 'room',
      parentId: 'tavern',
      depth: 2,
      summary: 'A cool cellar below the tavern.',
      description: 'Stacks of casks and a hidden tunnel crowd the room.',
      ports: [
        { id: 'cellar-up', name: 'Stairs Up', direction: 'up' },
        { id: 'cellar-east', name: 'Hidden Tunnel', direction: 'east' },
      ],
    },
    {
      id: 'gate',
      name: 'South Gate',
      type: 'room',
      parentId: 'district',
      depth: 1,
      summary: 'A gate leading out of town.',
      description: 'Wagons pass under the stone arch.',
      ports: [
        { id: 'gate-west', name: 'Town Road', direction: 'west' },
        { id: 'gate-down', name: 'Old Tunnel', direction: 'down' },
      ],
    },
  ],
  connections: [
    {
      id: 'square-tavern',
      fromLocationId: 'square',
      fromPortId: 'square-east',
      toLocationId: 'tavern',
      toPortId: 'tavern-west',
      bidirectional: true,
      travelMinutes: 2,
      label: 'Market Street',
    },
    {
      id: 'square-alley',
      fromLocationId: 'square',
      fromPortId: 'square-south',
      toLocationId: 'alley',
      toPortId: 'alley-north',
      bidirectional: false,
      travelMinutes: 1,
      label: 'Narrow Alley',
    },
    {
      id: 'tavern-cellar',
      fromLocationId: 'tavern',
      fromPortId: 'tavern-down',
      toLocationId: 'cellar',
      toPortId: 'cellar-up',
      bidirectional: true,
      travelMinutes: 3,
      locked: true,
      lockReason: 'Cellar door is barred',
    },
    {
      id: 'alley-gate',
      fromLocationId: 'alley',
      fromPortId: 'alley-east',
      toLocationId: 'gate',
      toPortId: 'gate-west',
      bidirectional: true,
      travelMinutes: 4,
      label: 'Outer Road',
    },
    {
      id: 'cellar-gate',
      fromLocationId: 'cellar',
      fromPortId: 'cellar-east',
      toLocationId: 'gate',
      toPortId: 'gate-down',
      bidirectional: true,
      travelMinutes: 6,
      label: 'Hidden Tunnel',
    },
  ],
});

describe('LocationService.buildNodeIndex', () => {
  it('indexes every node by id', () => {
    const index = LocationService.buildNodeIndex(map);

    expect(index.size).toBe(map.nodes.length);
    expect(index.has('square')).toBe(true);
    expect(index.has('gate')).toBe(true);
  });

  it('returns the original node data for a known id', () => {
    const index = LocationService.buildNodeIndex(map);

    expect(index.get('tavern')).toEqual(expect.objectContaining({ name: 'The Rusty Cup' }));
  });
});

describe('LocationService.buildAdjacencyList', () => {
  it('includes forward edges for each connection source', () => {
    const adjacency = LocationService.buildAdjacencyList(map);

    expect(adjacency.get('square')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          isReverse: false,
          connection: expect.objectContaining({ id: 'square-tavern' }),
        }),
        expect.objectContaining({
          isReverse: false,
          connection: expect.objectContaining({ id: 'square-alley' }),
        }),
      ])
    );
  });

  it('adds reverse entries for bidirectional connections', () => {
    const adjacency = LocationService.buildAdjacencyList(map);

    expect(adjacency.get('tavern')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          isReverse: true,
          connection: expect.objectContaining({ id: 'square-tavern' }),
        }),
      ])
    );
  });

  it('does not add reverse entries for one-way connections', () => {
    const adjacency = LocationService.buildAdjacencyList(map);

    expect(adjacency.get('alley')).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          connection: expect.objectContaining({ id: 'square-alley' }),
          isReverse: true,
        }),
      ])
    );
  });
});

describe('LocationService.getExitsForLocation', () => {
  it('returns forward and reverse exits for a location', () => {
    const exits = LocationService.getExitsForLocation(map, 'gate');

    expect(exits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ destinationId: 'alley', direction: 'west' }),
        expect.objectContaining({ destinationId: 'cellar', direction: 'down' }),
      ])
    );
  });

  it('filters locked exits when includeLockedExits is false', () => {
    const exits = LocationService.getExitsForLocation(map, 'tavern', false);

    expect(exits).toHaveLength(1);
    expect(exits[0]?.destinationId).toBe('square');
  });

  it('includes locked exits when includeLockedExits is true', () => {
    const exits = LocationService.getExitsForLocation(map, 'tavern', true);

    expect(exits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destinationId: 'cellar',
          locked: true,
          lockReason: 'Cellar door is barred',
        }),
      ])
    );
  });

  it('returns an empty array for an unknown location', () => {
    expect(LocationService.getExitsForLocation(map, 'missing')).toEqual([]);
  });
});

describe('LocationService.resolveDirection', () => {
  it('matches an exit by exact direction', () => {
    const result = LocationService.resolveDirection(map, 'square', 'east');

    expect(result.found).toBe(true);
    expect(result.exit?.destinationId).toBe('tavern');
  });

  it('matches an exit by exit name', () => {
    const result = LocationService.resolveDirection(map, 'tavern', 'door');

    expect(result.found).toBe(true);
    expect(result.exit?.destinationId).toBe('square');
  });

  it('matches an exit by destination name', () => {
    const result = LocationService.resolveDirection(map, 'square', 'rusty cup');

    expect(result.found).toBe(true);
    expect(result.exit?.destinationId).toBe('tavern');
  });

  it('matches a direction token embedded in the query text', () => {
    const result = LocationService.resolveDirection(map, 'square', 'go south now');

    expect(result.found).toBe(true);
    expect(result.exit?.destinationId).toBe('alley');
  });

  it('returns available alternatives for an unknown direction', () => {
    const result = LocationService.resolveDirection(map, 'square', 'northwest');

    expect(result.found).toBe(false);
    expect(result.alternatives).toHaveLength(2);
    expect(result.error).toContain('Available: east, south');
  });
});

describe('LocationService.resolveDestination', () => {
  it('matches by exact destination id', () => {
    const result = LocationService.resolveDestination(map, 'square', 'tavern');

    expect(result.found).toBe(true);
    expect(result.exit?.destinationName).toBe('The Rusty Cup');
  });

  it('matches by exact destination name', () => {
    const result = LocationService.resolveDestination(map, 'square', 'the rusty cup');

    expect(result.found).toBe(true);
    expect(result.exit?.destinationId).toBe('tavern');
  });

  it('matches by partial destination name', () => {
    const result = LocationService.resolveDestination(map, 'square', 'rusty');

    expect(result.found).toBe(true);
    expect(result.exit?.destinationId).toBe('tavern');
  });

  it('returns an error for an unreachable destination', () => {
    const result = LocationService.resolveDestination(map, 'square', 'wine cellar');

    expect(result.found).toBe(false);
    expect(result.error).toContain('not directly reachable');
  });
});

describe('LocationService.canReachDirectly', () => {
  it('returns reachable for an unlocked direct connection', () => {
    const result = LocationService.canReachDirectly(map, 'square', 'tavern');

    expect(result).toEqual(
      expect.objectContaining({
        reachable: true,
        exit: expect.objectContaining({ destinationId: 'tavern' }),
      })
    );
  });

  it('returns the lock reason for a locked connection', () => {
    const result = LocationService.canReachDirectly(map, 'tavern', 'cellar');

    expect(result.reachable).toBe(false);
    expect(result.reason).toBe('Cellar door is barred');
  });

  it('returns unreachable when no direct connection exists', () => {
    const result = LocationService.canReachDirectly(map, 'alley', 'square');

    expect(result).toEqual({
      reachable: false,
      reason: 'No direct connection to square',
    });
  });
});

describe('LocationService.findPath', () => {
  it('returns an immediate result when already at the destination', () => {
    const result = LocationService.findPath(map, 'square', 'square');

    expect(result).toEqual({
      reachable: true,
      path: ['square'],
      totalTravelMinutes: 0,
      routeDescription: 'You are already there.',
    });
  });

  it('finds a multi-hop route through unlocked connections', () => {
    const result = LocationService.findPath(map, 'tavern', 'gate');

    expect(result.reachable).toBe(true);
    expect(result.path).toEqual(['tavern', 'square', 'alley', 'gate']);
  });

  it('avoids a locked direct edge and uses an alternate route', () => {
    const result = LocationService.findPath(map, 'tavern', 'cellar');

    expect(result.reachable).toBe(true);
    expect(result.path).toEqual(['tavern', 'square', 'alley', 'gate', 'cellar']);
  });

  it('returns unreachable when no path exists', () => {
    const result = LocationService.findPath(map, 'cellar', 'square');

    expect(result).toEqual({
      reachable: false,
      path: [],
      totalTravelMinutes: 0,
      routeDescription: 'No path available.',
    });
  });

  it('accumulates travel time across the chosen path', () => {
    const result = LocationService.findPath(map, 'tavern', 'gate');

    expect(result.totalTravelMinutes).toBe(7);
  });

  it('builds a human-readable route description', () => {
    const result = LocationService.findPath(map, 'tavern', 'gate');

    expect(result.routeDescription).toBe('The Rusty Cup → Town Square → Back Alley → South Gate');
  });
});

describe('LocationService query helpers', () => {
  it('gets a location by id', () => {
    expect(LocationService.getLocation(map, 'alley')?.name).toBe('Back Alley');
  });

  it('gets a location by name case-insensitively', () => {
    expect(LocationService.getLocationByName(map, 'the rusty cup')?.id).toBe('tavern');
  });

  it('searches by name', () => {
    expect(LocationService.searchLocations(map, 'town square').map((node) => node.id)).toEqual([
      'square',
    ]);
  });

  it('searches by summary and description text', () => {
    expect(LocationService.searchLocations(map, 'damp').map((node) => node.id)).toEqual([
      'alley',
    ]);
  });

  it('returns child locations for a parent id', () => {
    expect(LocationService.getChildLocations(map, 'district').map((node) => node.id)).toEqual([
      'square',
      'tavern',
      'alley',
      'gate',
    ]);
  });

  it('returns the explicit default start location', () => {
    expect(LocationService.getDefaultStartLocation(map)?.id).toBe('square');
  });

  it('falls back to the first node when no default start is set', () => {
    const mapWithoutDefault = LocationMapSchema.parse({
      ...map,
      defaultStartLocationId: undefined,
    });

    expect(LocationService.getDefaultStartLocation(mapWithoutDefault)?.id).toBe('district');
  });
});

describe('LocationService formatting helpers', () => {
  it('formats exits for prompt context with direction, travel time, and lock info', () => {
    const exits = LocationService.getExitsForLocation(map, 'tavern', true);
    const formatted = LocationService.formatExitsForPrompt(exits);

    expect(formatted).toContain('[west] Main Door → Town Square (~2 min)');
    expect(formatted).toContain('[down] Cellar Stairs → Wine Cellar (~3 min) (LOCKED)');
  });

  it('formats a no-exit prompt message', () => {
    expect(LocationService.formatExitsForPrompt([])).toBe('No exits available.');
  });

  it('formats unlocked exit directions only', () => {
    const exits = LocationService.getExitsForLocation(map, 'tavern', true);

    expect(LocationService.formatExitDirections(exits)).toBe('west');
  });

  it('returns a no-exit message when all exits are locked', () => {
    const exits = LocationService.getExitsForLocation(map, 'tavern', true).filter(
      (exit) => exit.locked
    );

    expect(LocationService.formatExitDirections(exits)).toBe('No exits available.');
  });
});

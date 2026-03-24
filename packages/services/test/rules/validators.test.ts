import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultNpcLocationState, type GameTime } from '@arcagentic/schemas';

const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  getLocationConnections: vi.fn(),
  getActorState: vi.fn(),
  getInventoryItem: vi.fn(),
}));

const hoistedErrors = vi.hoisted(() => {
  class MockLocationDataValidationError extends Error {
    details: unknown;

    constructor(details: unknown) {
      super('Location data is invalid');
      this.name = 'LocationDataValidationError';
      this.details = details;
    }
  }

  return { MockLocationDataValidationError };
});

vi.mock('@arcagentic/logger', () => ({
  createLogger: vi.fn(() => loggerMock),
}));

vi.mock('@arcagentic/db', () => ({
  getLocationConnections: dbMocks.getLocationConnections,
  getActorState: dbMocks.getActorState,
  getInventoryItem: dbMocks.getInventoryItem,
  LocationDataValidationError: hoistedErrors.MockLocationDataValidationError,
}));

import {
  ValidationContext,
  Validators,
} from '../../src/rules/validators.js';

function buildContext(overrides: Partial<ValidationContext> = {}): ValidationContext {
  return {
    sessionId: 'session-1',
    actorId: 'player-1',
    currentLocationId: 'square',
    actorsAtLocation: ['npc-1', 'npc-2'],
    inventoryItemIds: ['apple', 'key'],
    ...overrides,
  };
}

function at(hour: number): GameTime {
  return {
    year: 1,
    month: 1,
    dayOfMonth: 1,
    absoluteDay: 1,
    hour,
    minute: 0,
    second: 0,
  };
}

function buildMoveIntent(overrides: Record<string, unknown> = {}) {
  return {
    type: 'MOVE_INTENT' as const,
    sessionId: 'session-1',
    actorId: 'player-1',
    destinationId: 'tavern',
    timestamp: new Date('2026-03-24T10:00:00Z'),
    ...overrides,
  };
}

function buildSpeakIntent(overrides: Record<string, unknown> = {}) {
  return {
    type: 'SPEAK_INTENT' as const,
    sessionId: 'session-1',
    actorId: 'player-1',
    content: 'Hello there',
    timestamp: new Date('2026-03-24T10:00:00Z'),
    ...overrides,
  };
}

describe('Validators.validateAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getLocationConnections.mockResolvedValue([]);
    dbMocks.getActorState.mockResolvedValue(null);
    dbMocks.getInventoryItem.mockResolvedValue(null);
  });

  it('validates a reachable MOVE_INTENT', async () => {
    dbMocks.getLocationConnections.mockResolvedValue([
      { connectionId: 'square-tavern', targetLocationId: 'tavern', targetName: 'The Rusty Cup' },
    ]);

    const result = await Validators.validateAction(
      buildMoveIntent({ destinationId: 'tavern' }),
      buildContext()
    );

    expect(result).toEqual({ valid: true, reason: '' });
  });

  it('rejects an unreachable MOVE_INTENT and lists available exits', async () => {
    dbMocks.getLocationConnections.mockResolvedValue([
      { connectionId: 'square-tavern', targetLocationId: 'tavern', targetName: 'The Rusty Cup' },
      { connectionId: 'square-gate', targetLocationId: 'gate', targetName: 'South Gate' },
    ]);

    const result = await Validators.validateAction(
      buildMoveIntent({ destinationId: 'cellar' }),
      buildContext()
    );

    expect(result).toEqual({
      valid: false,
      reason: 'Cannot reach cellar from current location',
      suggestion: 'Available exits: The Rusty Cup, South Gate',
    });
  });

  it('rejects MOVE_INTENT when the location map data is invalid', async () => {
    dbMocks.getLocationConnections.mockRejectedValue(
      new hoistedErrors.MockLocationDataValidationError({
        entity: 'map',
        fields: ['nodesJson'],
        issues: [],
      })
    );

    const result = await Validators.validateAction(
      buildMoveIntent({ destinationId: 'cellar' }),
      buildContext()
    );

    expect(result).toEqual({
      valid: false,
      reason: 'Location map data is invalid. Please delete or repair the map.',
    });
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
  });

  it('validates untargeted SPEAK_INTENT with content', async () => {
    const result = await Validators.validateAction(
      buildSpeakIntent({ content: 'Hello there' }),
      buildContext()
    );

    expect(result).toEqual({ valid: true, reason: '' });
  });

  it('rejects SPEAK_INTENT when the target is missing from the location', async () => {
    const result = await Validators.validateAction(
      buildSpeakIntent({ content: 'Hello there', targetActorId: 'npc-9' }),
      buildContext()
    );

    expect(result).toEqual({
      valid: false,
      reason: 'npc-9 is not at your current location',
    });
  });

  it('rejects SPEAK_INTENT with empty content', async () => {
    const result = await Validators.validateAction(
      buildSpeakIntent({ content: '   ' }),
      buildContext()
    );

    expect(result).toEqual({
      valid: false,
      reason: 'Cannot speak without content',
    });
  });

  it('rejects SPEAK_INTENT when the target is too busy to talk', async () => {
    dbMocks.getActorState.mockResolvedValue({
      state: {
        role: 'supporting',
        tier: 'minor',
        name: 'Busy NPC',
        status: 'active',
        locationState: {
          ...createDefaultNpcLocationState('square', at(10)),
          interruptible: false,
        },
      },
    });

    const result = await Validators.validateAction(
      buildSpeakIntent({ content: 'Hello there', targetActorId: 'npc-1' }),
      buildContext()
    );

    expect(result).toEqual({
      valid: false,
      reason: 'npc-1 is too busy to talk right now',
      suggestion: 'Try again later or wait for them to finish',
    });
  });

  it('validates USE_ITEM_INTENT when the item is already in inventory', async () => {
    const result = await Validators.validateAction(
      {
        type: 'USE_ITEM_INTENT',
        sessionId: 'session-1',
        actorId: 'player-1',
        itemId: 'apple',
        timestamp: new Date('2026-03-24T10:00:00Z'),
      },
      buildContext()
    );

    expect(result).toEqual({ valid: true, reason: '' });
    expect(dbMocks.getInventoryItem).not.toHaveBeenCalled();
  });

  it('validates USE_ITEM_INTENT when the item can be loaded from persistence', async () => {
    dbMocks.getInventoryItem.mockResolvedValue({ id: 'map' });

    const result = await Validators.validateAction(
      {
        type: 'USE_ITEM_INTENT',
        sessionId: 'session-1',
        actorId: 'player-1',
        itemId: 'map',
        timestamp: new Date('2026-03-24T10:00:00Z'),
      },
      buildContext({ inventoryItemIds: [] })
    );

    expect(result).toEqual({ valid: true, reason: '' });
  });

  it('rejects USE_ITEM_INTENT when the item is missing', async () => {
    const result = await Validators.validateAction(
      {
        type: 'USE_ITEM_INTENT',
        sessionId: 'session-1',
        actorId: 'player-1',
        itemId: 'map',
        timestamp: new Date('2026-03-24T10:00:00Z'),
      },
      buildContext({ inventoryItemIds: [] })
    );

    expect(result).toEqual({
      valid: false,
      reason: 'You don\'t have "map"',
    });
  });

  it('validates ATTACK_INTENT when the target is present', async () => {
    const result = await Validators.validateAction(
      {
        type: 'ATTACK_INTENT',
        sessionId: 'session-1',
        actorId: 'player-1',
        targetActorId: 'npc-2',
        timestamp: new Date('2026-03-24T10:00:00Z'),
      },
      buildContext()
    );

    expect(result).toEqual({ valid: true, reason: '' });
  });

  it('rejects ATTACK_INTENT when the target is not present', async () => {
    const result = await Validators.validateAction(
      {
        type: 'ATTACK_INTENT',
        sessionId: 'session-1',
        actorId: 'player-1',
        targetActorId: 'npc-9',
        timestamp: new Date('2026-03-24T10:00:00Z'),
      },
      buildContext()
    );

    expect(result).toEqual({
      valid: false,
      reason: 'npc-9 is not here',
    });
  });

  it('always validates TAKE_ITEM_INTENT', async () => {
    const result = await Validators.validateAction(
      {
        type: 'TAKE_ITEM_INTENT',
        sessionId: 'session-1',
        actorId: 'player-1',
        itemId: 'coin',
        timestamp: new Date('2026-03-24T10:00:00Z'),
      },
      buildContext()
    );

    expect(result).toEqual({ valid: true, reason: '' });
  });
});

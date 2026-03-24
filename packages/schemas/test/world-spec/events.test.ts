import {
  EffectSchema,
  IntentSchema,
  SystemEventSchema,
  WireWorldEventSchema,
  WorldEventSchema,
} from '@arcagentic/schemas';
import {
  buildActorSpawnEvent,
  buildMoveIntent,
  buildMovedEffect,
  buildSessionStartEvent,
  buildSpeakIntent,
  buildSpokeEffect,
  buildTickEvent,
} from '../../../../config/vitest/builders/world-event.js';

describe('World event schemas', () => {
  it('parses every supported intent type', () => {
    const intents = [
      buildMoveIntent(),
      buildSpeakIntent(),
      {
        type: 'USE_ITEM_INTENT',
        sessionId: 'session-test-001',
        actorId: 'actor-test-001',
        itemId: 'item-test-001',
        timestamp: new Date('2025-01-01T00:00:00Z'),
      },
      {
        type: 'TAKE_ITEM_INTENT',
        sessionId: 'session-test-001',
        actorId: 'actor-test-001',
        itemId: 'item-test-001',
        timestamp: new Date('2025-01-01T00:00:00Z'),
      },
      {
        type: 'DROP_ITEM_INTENT',
        sessionId: 'session-test-001',
        actorId: 'actor-test-001',
        itemId: 'item-test-001',
        timestamp: new Date('2025-01-01T00:00:00Z'),
      },
      {
        type: 'ATTACK_INTENT',
        sessionId: 'session-test-001',
        actorId: 'actor-test-001',
        targetActorId: 'actor-test-002',
        timestamp: new Date('2025-01-01T00:00:00Z'),
      },
      {
        type: 'WAIT_INTENT',
        sessionId: 'session-test-001',
        actorId: 'actor-test-001',
        duration: 5,
        timestamp: new Date('2025-01-01T00:00:00Z'),
      },
    ];

    intents.forEach((event) => {
      expect(IntentSchema.safeParse(event).success).toBe(true);
      expect(WorldEventSchema.safeParse(event).success).toBe(true);
    });
  });

  it('parses every supported effect type', () => {
    const effects = [
      buildMovedEffect(),
      buildSpokeEffect(),
      {
        type: 'DAMAGED',
        actorId: 'actor-test-001',
        amount: 5,
        sessionId: 'session-test-001',
        timestamp: new Date('2025-01-01T00:00:00Z'),
      },
      {
        type: 'ITEM_ACQUIRED',
        actorId: 'actor-test-001',
        itemId: 'item-test-001',
        sessionId: 'session-test-001',
        timestamp: new Date('2025-01-01T00:00:00Z'),
      },
      {
        type: 'ITEM_DROPPED',
        actorId: 'actor-test-001',
        itemId: 'item-test-001',
        sessionId: 'session-test-001',
        timestamp: new Date('2025-01-01T00:00:00Z'),
      },
      {
        type: 'ITEM_USED',
        actorId: 'actor-test-001',
        itemId: 'item-test-001',
        sessionId: 'session-test-001',
        timestamp: new Date('2025-01-01T00:00:00Z'),
      },
      {
        type: 'HEALED',
        actorId: 'actor-test-001',
        amount: 4,
        sessionId: 'session-test-001',
        timestamp: new Date('2025-01-01T00:00:00Z'),
      },
      {
        type: 'DIED',
        actorId: 'actor-test-001',
        sessionId: 'session-test-001',
        timestamp: new Date('2025-01-01T00:00:00Z'),
      },
      {
        type: 'NPC_ACTIVITY_CHANGED',
        actorId: 'actor-test-001',
        previousActivity: 'waiting',
        newActivity: 'walking',
        sessionId: 'session-test-001',
        timestamp: new Date('2025-01-01T00:00:00Z'),
      },
      {
        type: 'OBJECT_EXAMINED',
        actorId: 'actor-test-001',
        target: 'crate',
        focus: 'lock',
        locationId: 'loc-001',
        sessionId: 'session-test-001',
        timestamp: new Date('2025-01-01T00:00:00Z'),
      },
    ];

    effects.forEach((event) => {
      expect(EffectSchema.safeParse(event).success).toBe(true);
      expect(WorldEventSchema.safeParse(event).success).toBe(true);
    });
  });

  it('parses every supported system event type', () => {
    const systemEvents = [
      buildTickEvent(),
      buildSessionStartEvent(),
      {
        type: 'SESSION_END',
        sessionId: 'session-test-001',
        timestamp: new Date('2025-01-01T00:00:00Z'),
      },
      buildActorSpawnEvent(),
      {
        type: 'ACTOR_DESPAWN',
        actorId: 'actor-test-001',
        sessionId: 'session-test-001',
        timestamp: new Date('2025-01-01T00:00:00Z'),
      },
      {
        type: 'ACTION_REJECTED',
        originalEventType: 'MOVE_INTENT',
        actorId: 'actor-test-001',
        reason: 'blocked',
        suggestion: 'pick another exit',
        sessionId: 'session-test-001',
        timestamp: new Date('2025-01-01T00:00:00Z'),
      },
    ];

    systemEvents.forEach((event) => {
      expect(SystemEventSchema.safeParse(event).success).toBe(true);
      expect(WorldEventSchema.safeParse(event).success).toBe(true);
    });
  });

  it('rejects unknown world event types', () => {
    expect(
      WorldEventSchema.safeParse({
        type: 'UNKNOWN_EVENT',
        sessionId: 'session-test-001',
      }).success
    ).toBe(false);
  });

  it('rejects payloads missing a type field', () => {
    expect(
      WorldEventSchema.safeParse({
        sessionId: 'session-test-001',
        actorId: 'actor-test-001',
      }).success
    ).toBe(false);
  });

  it('coerces ISO date strings to Date objects for wire events', () => {
    const result = WireWorldEventSchema.parse({
      ...buildMoveIntent(),
      timestamp: '2025-01-01T00:00:00.000Z',
    });

    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.timestamp?.toISOString()).toBe('2025-01-01T00:00:00.000Z');
  });

  it('coerces epoch numbers to Date objects for wire events', () => {
    const result = WireWorldEventSchema.parse({
      ...buildTickEvent(),
      timestamp: 1735689600000,
    });

    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.timestamp?.toISOString()).toBe('2025-01-01T00:00:00.000Z');
  });

  it('still parses events with extra unknown properties', () => {
    const result = WorldEventSchema.safeParse({
      ...buildMoveIntent(),
      unexpected: 'extra-data',
    });

    expect(result.success).toBe(true);
  });
});

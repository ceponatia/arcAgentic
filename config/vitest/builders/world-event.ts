import type { WorldEvent } from '@arcagentic/schemas';

type MoveIntent = Extract<WorldEvent, { type: 'MOVE_INTENT' }>;
type SpeakIntent = Extract<WorldEvent, { type: 'SPEAK_INTENT' }>;
type MovedEffect = Extract<WorldEvent, { type: 'MOVED' }>;
type SpokeEffect = Extract<WorldEvent, { type: 'SPOKE' }>;
type TickEvent = Extract<WorldEvent, { type: 'TICK' }>;
type SessionStartEvent = Extract<WorldEvent, { type: 'SESSION_START' }>;
type ActorSpawnEvent = Extract<WorldEvent, { type: 'ACTOR_SPAWN' }>;

const DEFAULT_TIMESTAMP = new Date('2025-01-01T00:00:00Z');

export function buildMoveIntent(overrides: Partial<MoveIntent> = {}): MoveIntent {
  return {
    type: 'MOVE_INTENT',
    sessionId: 'session-test-001',
    actorId: 'actor-test-001',
    destinationId: 'loc-002',
    timestamp: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function buildSpeakIntent(overrides: Partial<SpeakIntent> = {}): SpeakIntent {
  return {
    type: 'SPEAK_INTENT',
    sessionId: 'session-test-001',
    actorId: 'actor-test-001',
    content: 'Test message',
    timestamp: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function buildMovedEffect(overrides: Partial<MovedEffect> = {}): MovedEffect {
  return {
    type: 'MOVED',
    actorId: 'actor-test-001',
    fromLocationId: 'loc-001',
    toLocationId: 'loc-002',
    sessionId: 'session-test-001',
    timestamp: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function buildSpokeEffect(overrides: Partial<SpokeEffect> = {}): SpokeEffect {
  return {
    type: 'SPOKE',
    actorId: 'actor-test-001',
    content: 'Test message',
    sessionId: 'session-test-001',
    timestamp: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function buildTickEvent(overrides: Partial<TickEvent> = {}): TickEvent {
  return {
    type: 'TICK',
    tick: 1,
    sessionId: 'session-test-001',
    timestamp: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function buildSessionStartEvent(
  overrides: Partial<SessionStartEvent> = {}
): SessionStartEvent {
  return {
    type: 'SESSION_START',
    sessionId: 'session-test-001',
    timestamp: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function buildActorSpawnEvent(
  overrides: Partial<ActorSpawnEvent> = {}
): ActorSpawnEvent {
  return {
    type: 'ACTOR_SPAWN',
    actorId: 'actor-test-001',
    actorType: 'npc',
    locationId: 'loc-001',
    sessionId: 'session-test-001',
    timestamp: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

import type { NpcActorState } from '@arcagentic/schemas';

export function buildNpcActorState(
  overrides: Partial<NpcActorState> = {}
): NpcActorState {
  return {
    role: 'supporting',
    tier: 'minor',
    name: 'Test NPC',
    status: 'active',
    location: { currentLocationId: 'loc-001' },
    ...overrides,
  };
}

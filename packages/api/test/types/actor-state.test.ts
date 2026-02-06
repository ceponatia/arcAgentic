import { describe, expect, it } from 'vitest';
import type { ActorState, NpcActorState, PlayerActorState } from '@minimal-rpg/schemas';
import {
  asActorState,
  asNpcState,
  asPlayerState,
  isNpcState,
  isPlayerState,
} from '../../src/types/index.js';

const npcState: NpcActorState = {
  role: 'primary',
  tier: 'minor',
  name: 'Rika',
  status: 'active',
};

const playerState: PlayerActorState = {
  profile: { id: 'player-1' },
  status: 'active',
};

describe('types/actor-state', () => {
  it('identifies npc states', () => {
    expect(isNpcState(npcState)).toBe(true);
    expect(isNpcState(playerState)).toBe(false);
  });

  it('identifies player states', () => {
    expect(isPlayerState(playerState)).toBe(true);
    expect(isPlayerState(npcState)).toBe(false);
  });

  it('treats mixed shapes as non-player', () => {
    const mixedState = ({
      profile: { id: 'player-2' },
      tier: 'minor',
      status: 'active',
    } as unknown) as ActorState;

    expect(isPlayerState(mixedState)).toBe(false);
  });

  it('casts actor state helpers without mutation', () => {
    const castActor = asActorState(npcState);
    const castNpc = asNpcState(npcState);
    const castPlayer = asPlayerState(playerState);

    expect(castActor).toBe(npcState);
    expect(castNpc).toBe(npcState);
    expect(castPlayer).toBe(playerState);
  });
});

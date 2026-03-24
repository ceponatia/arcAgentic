import { describe, expect, it } from 'vitest';

import type { EncounterNpcInfo, NpcActivity } from '@arcagentic/schemas';

import {
  generateEncounterNarration,
  generateNpcEntranceNarration,
  generateNpcExitNarration,
} from '../../src/simulation/encounter.js';

function activity(overrides: Partial<NpcActivity> = {}): NpcActivity {
  return {
    type: 'socializing',
    description: 'Chatting with other patrons',
    engagement: 'casual',
    ...overrides,
  };
}

function npc(overrides: Partial<EncounterNpcInfo> = {}): EncounterNpcInfo {
  return {
    npcId: 'npc-1',
    name: 'Marin',
    appearance: 'cloaked traveler',
    activity: activity(),
    tier: 'major',
    ...overrides,
  };
}

describe('generateEncounterNarration', () => {
  it('builds narration for a location with notable and background npcs', () => {
    const result = generateEncounterNarration({
      locationName: 'The Rusty Cup',
      locationDescription: 'Warm lamplight spills across the tables.',
      npcsPresent: [
        npc(),
        npc({ npcId: 'npc-2', name: 'Bera', tier: 'background' }),
        npc({ npcId: 'npc-3', name: 'Cale', tier: 'transient' }),
      ],
      crowdLevel: 'moderate',
      timeOfDay: 'evening',
      playerEntering: true,
    });

    expect(result.sceneDescription).toContain('You enter The Rusty Cup.');
    expect(result.sceneDescription).toContain('Evening shadows lengthen.');
    expect(result.npcIntroductions).toHaveLength(1);
    expect(result.npcIntroductions[0]?.npcId).toBe('npc-1');
    expect(result.crowdDescription).toContain('A few');
    expect(result.fullNarration).toContain(result.sceneDescription);
  });

  it('returns only a scene description when no npcs are present', () => {
    const result = generateEncounterNarration({
      locationName: 'Empty Shrine',
      npcsPresent: [],
      crowdLevel: 'empty',
      timeOfDay: 'night',
      playerEntering: true,
    });

    expect(result.npcIntroductions).toEqual([]);
    expect(result.crowdDescription).toBeNull();
    expect(result.fullNarration).toBe(result.sceneDescription);
  });

  it('uses the in-place scene phrasing when the player is already present', () => {
    const result = generateEncounterNarration({
      locationName: 'Town Square',
      npcsPresent: [],
      crowdLevel: 'sparse',
      timeOfDay: 'morning',
      playerEntering: false,
    });

    expect(result.sceneDescription).toContain('You are in Town Square.');
    expect(result.sceneDescription).toContain('Morning activity fills the air.');
  });

  it('includes the correct atmosphere phrase for dawn', () => {
    const result = generateEncounterNarration({
      locationName: 'Gatehouse',
      npcsPresent: [],
      crowdLevel: 'sparse',
      timeOfDay: 'dawn',
      playerEntering: true,
    });

    expect(result.sceneDescription).toContain('The early morning light filters in.');
  });

  it('includes the correct atmosphere phrase for packed crowds', () => {
    const result = generateEncounterNarration({
      locationName: 'Festival Square',
      npcsPresent: [],
      crowdLevel: 'packed',
      timeOfDay: 'midday',
      playerEntering: true,
    });

    expect(result.sceneDescription).toContain('People fill every available space.');
  });

  it('describes a single background npc as nearby', () => {
    const result = generateEncounterNarration({
      locationName: 'Dockside',
      npcsPresent: [npc({ tier: 'background' })],
      crowdLevel: 'sparse',
      playerEntering: true,
    });

    expect(result.crowdDescription).toBe('A cloaked traveler is nearby.');
  });

  it('summarizes larger background crowds by crowd level', () => {
    const result = generateEncounterNarration({
      locationName: 'Market',
      npcsPresent: [
        npc({ npcId: 'npc-1', tier: 'background' }),
        npc({ npcId: 'npc-2', name: 'Bera', tier: 'background' }),
        npc({ npcId: 'npc-3', name: 'Cale', tier: 'background' }),
        npc({ npcId: 'npc-4', name: 'Dain', tier: 'transient' }),
      ],
      crowdLevel: 'crowded',
      playerEntering: true,
    });

    expect(result.crowdDescription).toBe('many people go about their business.');
  });

  it('describes absorbed activity in introductions as deeply focused', () => {
    const result = generateEncounterNarration({
      locationName: 'Archive',
      npcsPresent: [
        npc({
          activity: activity({
            type: 'studying',
            description: 'Studying old tomes',
            engagement: 'absorbed',
          }),
        }),
      ],
      crowdLevel: 'empty',
      playerEntering: true,
    });

    expect(result.npcIntroductions[0]?.introduction.toLowerCase()).toContain('deeply focused');
  });
});

describe('generateNpcEntranceNarration', () => {
  it('includes the npc name and entrance direction', () => {
    const result = generateNpcEntranceNarration(npc(), 'north');

    expect(result).toContain('Marin');
    expect(result).toContain('from the north');
  });

  it('includes non-idle activity context', () => {
    const result = generateNpcEntranceNarration(
      npc({
        activity: activity({
          type: 'working',
          description: 'Working diligently',
          engagement: 'focused',
        }),
      })
    );

    expect(result).toContain('Marin');
    expect(result).toContain('Working diligently');
  });
});

describe('generateNpcExitNarration', () => {
  it('includes the npc name and exit direction', () => {
    const result = generateNpcExitNarration(npc(), 'east');

    expect(result).toContain('Marin');
    expect(result).toContain('toward the east');
  });

  it('omits the direction phrase when none is provided', () => {
    const result = generateNpcExitNarration(npc());

    expect(result).toContain('Marin');
    expect(result).not.toContain('toward the');
  });
});

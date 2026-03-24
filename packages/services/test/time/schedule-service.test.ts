import { describe, expect, it } from 'vitest';

import type { GameTime, NpcSchedule, NpcScheduleData } from '@arcagentic/schemas';
import { COMMON_ACTIVITIES, createHomeWorkSchedule } from '@arcagentic/schemas';

import {
  checkNpcAvailability,
  getNpcsAtLocationBySchedule,
  resolveNpcScheduleAtTime,
  resolveNpcSchedulesBatch,
} from '../../src/time/schedule-service.js';

function at(hour: number, minute = 0, absoluteDay = 1): GameTime {
  return {
    year: 1,
    month: 1,
    dayOfMonth: absoluteDay,
    absoluteDay,
    hour,
    minute,
    second: 0,
  };
}

function buildNpc(overrides: Partial<NpcScheduleData> = {}): NpcScheduleData {
  return {
    npcId: 'npc-1',
    ...overrides,
  };
}

function buildSchedule(overrides: Partial<NpcSchedule> = {}): NpcSchedule {
  return {
    id: 'schedule-1',
    name: 'Test Schedule',
    slots: [
      {
        id: 'work-slot',
        startTime: { hour: 9, minute: 0 },
        endTime: { hour: 17, minute: 0 },
        destination: { type: 'fixed', locationId: 'shop' },
        activity: COMMON_ACTIVITIES.working,
      },
    ],
    defaultSlot: {
      destination: { type: 'fixed', locationId: 'home' },
      activity: COMMON_ACTIVITIES.relaxing,
    },
    ...overrides,
  };
}

describe('resolveNpcScheduleAtTime', () => {
  it('resolves an active direct schedule slot', () => {
    const npc = buildNpc({
      schedule: createHomeWorkSchedule('merchant', 'Merchant', 'home', 'shop'),
    });

    const result = resolveNpcScheduleAtTime(npc, { currentTime: at(9) });

    expect(result).not.toBeNull();
    expect(result?.resolution.locationId).toBe('shop');
    expect(result?.resolution.activity.type).toBe('working');
    expect(result?.resolution.matchedSlotId).toBe('merchant-work');
    expect(result?.locationState.interruptible).toBe(true);
  });

  it('uses the schedule default slot when no timed slot matches', () => {
    const npc = buildNpc({
      schedule: buildSchedule({
        slots: [
          {
            id: 'weekday-slot',
            startTime: { hour: 9, minute: 0 },
            endTime: { hour: 17, minute: 0 },
            destination: { type: 'fixed', locationId: 'shop' },
            activity: COMMON_ACTIVITIES.working,
            activeDays: [2],
          },
        ],
      }),
    });

    const result = resolveNpcScheduleAtTime(npc, { currentTime: at(10, 0, 1) });

    expect(result?.resolution.locationId).toBe('home');
    expect(result?.resolution.activity.type).toBe('relaxing');
    expect(result?.resolution.matchedSlotId).toBeUndefined();
  });

  it('preserves a resolved sub-location id', () => {
    const npc = buildNpc({
      schedule: buildSchedule({
        slots: [
          {
            id: 'counter-slot',
            startTime: { hour: 9, minute: 0 },
            endTime: { hour: 12, minute: 0 },
            destination: { type: 'fixed', locationId: 'shop', subLocationId: 'counter' },
            activity: COMMON_ACTIVITIES.working,
          },
        ],
      }),
    });

    const result = resolveNpcScheduleAtTime(npc, { currentTime: at(10) });

    expect(result?.resolution.subLocationId).toBe('counter');
    expect(result?.locationState.subLocationId).toBe('counter');
  });

  it('resolves a template-based schedule with an explicit template map', () => {
    const npc = buildNpc({
      scheduleRef: {
        templateId: 'template-shopkeeper',
        placeholders: {
          workLocation: 'shop',
          homeLocation: 'home',
        },
      },
      homeLocationId: 'home',
    });

    const result = resolveNpcScheduleAtTime(npc, {
      currentTime: at(9),
      templateMap: new Map(),
    });

    expect(result?.resolution.locationId).toBe('home');
  });

  it('resolves a template-based schedule with the default template map', () => {
    const npc = buildNpc({
      scheduleRef: {
        templateId: 'template-shopkeeper',
        placeholders: {
          workLocation: 'shop',
          homeLocation: 'home',
        },
      },
    });

    const result = resolveNpcScheduleAtTime(npc, { currentTime: at(9) });

    expect(result?.resolution.locationId).toBe('shop');
    expect(result?.resolution.activity.type).toBe('working');
  });

  it('resolves a template lunch slot at the home location', () => {
    const npc = buildNpc({
      scheduleRef: {
        templateId: 'template-shopkeeper',
        placeholders: {
          workLocation: 'shop',
          homeLocation: 'home',
        },
      },
    });

    const result = resolveNpcScheduleAtTime(npc, { currentTime: at(12, 30) });

    expect(result?.resolution.locationId).toBe('home');
    expect(result?.resolution.activity.type).toBe('eating');
  });

  it('falls back to the home location when no schedule exists', () => {
    const result = resolveNpcScheduleAtTime(
      buildNpc({ homeLocationId: 'home', workLocationId: 'shop' }),
      { currentTime: at(11) }
    );

    expect(result?.resolution.locationId).toBe('home');
    expect(result?.resolution.activity.type).toBe('idle');
    expect(result?.locationState.interruptible).toBe(true);
  });

  it('falls back to the work location when home is missing', () => {
    const result = resolveNpcScheduleAtTime(buildNpc({ workLocationId: 'shop' }), {
      currentTime: at(11),
    });

    expect(result?.resolution.locationId).toBe('shop');
  });

  it('returns null when no schedule or fallback locations are available', () => {
    const result = resolveNpcScheduleAtTime(buildNpc(), { currentTime: at(11) });

    expect(result).toBeNull();
  });

  it('marks absorbed activities as non-interruptible in location state', () => {
    const npc = buildNpc({
      schedule: buildSchedule({
        slots: [
          {
            id: 'study-slot',
            startTime: { hour: 9, minute: 0 },
            endTime: { hour: 17, minute: 0 },
            destination: { type: 'fixed', locationId: 'study' },
            activity: {
              type: 'reading',
              description: 'Reading ledgers',
              engagement: 'absorbed',
            },
          },
        ],
      }),
    });

    const result = resolveNpcScheduleAtTime(npc, { currentTime: at(10) });

    expect(result?.resolution.activity.engagement).toBe('absorbed');
    expect(result?.locationState.interruptible).toBe(false);
  });
});

describe('resolveNpcSchedulesBatch', () => {
  it('resolves multiple NPCs into keyed maps', () => {
    const result = resolveNpcSchedulesBatch(
      [
        buildNpc({
          npcId: 'npc-a',
          schedule: createHomeWorkSchedule('a', 'A', 'home-a', 'shop-a'),
        }),
        buildNpc({
          npcId: 'npc-b',
          schedule: createHomeWorkSchedule('b', 'B', 'home-b', 'shop-b'),
        }),
      ],
      { currentTime: at(10) }
    );

    expect(result.locationStates.get('npc-a')?.locationId).toBe('shop-a');
    expect(result.locationStates.get('npc-b')?.locationId).toBe('shop-b');
    expect(result.resolutions.get('npc-a')?.activity.type).toBe('working');
    expect(result.unresolved).toEqual([]);
  });

  it('tracks unresolved NPC ids', () => {
    const result = resolveNpcSchedulesBatch(
      [
        buildNpc({ npcId: 'resolved', homeLocationId: 'home' }),
        buildNpc({ npcId: 'missing' }),
      ],
      { currentTime: at(8) }
    );

    expect(result.locationStates.has('resolved')).toBe(true);
    expect(result.locationStates.has('missing')).toBe(false);
    expect(result.unresolved).toEqual(['missing']);
  });

  it('stores matching resolution metadata per npc', () => {
    const result = resolveNpcSchedulesBatch(
      [
        buildNpc({
          npcId: 'npc-a',
          schedule: createHomeWorkSchedule('a', 'A', 'home-a', 'shop-a'),
        }),
      ],
      { currentTime: at(18, 30) }
    );

    expect(result.resolutions.get('npc-a')?.locationId).toBe('home-a');
    expect(result.resolutions.get('npc-a')?.matchedSlotId).toBe('a-home-evening');
  });
});

describe('checkNpcAvailability', () => {
  it('returns available for casual activity', () => {
    const result = checkNpcAvailability(
      buildNpc({
        schedule: buildSchedule({
          slots: [
            {
              id: 'social-slot',
              startTime: { hour: 9, minute: 0 },
              endTime: { hour: 17, minute: 0 },
              destination: { type: 'fixed', locationId: 'plaza' },
              activity: COMMON_ACTIVITIES.socializing,
            },
          ],
        }),
      }),
      { currentTime: at(10) }
    );

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.locationId).toBe('plaza');
      expect(result.activity.type).toBe('socializing');
    }
  });

  it('returns available for focused but interruptible activity', () => {
    const result = checkNpcAvailability(
      buildNpc({
        schedule: buildSchedule({
          slots: [
            {
              id: 'work-slot',
              startTime: { hour: 9, minute: 0 },
              endTime: { hour: 17, minute: 0 },
              destination: { type: 'fixed', locationId: 'office' },
              activity: COMMON_ACTIVITIES.working,
            },
          ],
        }),
      }),
      { currentTime: at(10) }
    );

    expect(result.available).toBe(true);
  });

  it('returns unavailable when the schedule cannot be resolved', () => {
    const result = checkNpcAvailability(buildNpc(), { currentTime: at(10) });

    expect(result).toEqual({
      available: false,
      reason: 'NPC schedule could not be resolved',
    });
  });

  it('returns unavailable when an active override marks the npc unavailable', () => {
    const result = checkNpcAvailability(
      buildNpc({
        schedule: buildSchedule({
          overrides: [
            {
              id: 'vacation',
              condition: {
                type: 'event',
                key: 'event',
                value: 'festival',
                effect: 'require',
              },
              behavior: 'unavailable',
              activity: {
                type: 'traveling',
                description: 'Out of town',
                engagement: 'absorbed',
              },
            },
          ],
        }),
      }),
      {
        currentTime: at(10),
        conditionContext: {
          activeEvents: ['festival'],
        },
      }
    );

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toBe('NPC is currently unavailable');
      expect(result.locationId).toBe('unavailable');
      expect(result.activity?.type).toBe('traveling');
    }
  });

  it('returns unavailable for absorbed activity', () => {
    const result = checkNpcAvailability(
      buildNpc({
        schedule: buildSchedule({
          slots: [
            {
              id: 'study-slot',
              startTime: { hour: 9, minute: 0 },
              endTime: { hour: 17, minute: 0 },
              destination: { type: 'fixed', locationId: 'study' },
              activity: {
                type: 'studying',
                description: 'Studying ancient texts',
                engagement: 'absorbed',
              },
            },
          ],
        }),
      }),
      { currentTime: at(10) }
    );

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toContain('deeply focused');
      expect(result.locationId).toBe('study');
    }
  });

  it('returns unavailable for sleeping activity', () => {
    const result = checkNpcAvailability(
      buildNpc({
        schedule: buildSchedule({
          slots: [
            {
              id: 'sleep-slot',
              startTime: { hour: 22, minute: 0 },
              endTime: { hour: 6, minute: 0 },
              destination: { type: 'fixed', locationId: 'home' },
              activity: {
                type: 'sleeping',
                description: 'Sleeping lightly',
                engagement: 'casual',
              },
            },
          ],
        }),
      }),
      { currentTime: at(23) }
    );

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toBe('NPC is sleeping');
      expect(result.locationId).toBe('home');
    }
  });
});

describe('getNpcsAtLocationBySchedule', () => {
  it('returns only NPCs scheduled for the requested location', () => {
    const npcs = [
      buildNpc({ npcId: 'npc-a', homeLocationId: 'home' }),
      buildNpc({ npcId: 'npc-b', homeLocationId: 'home' }),
    ];

    const result = getNpcsAtLocationBySchedule(npcs, 'home', { currentTime: at(8) });

    expect(result).toEqual([
      expect.objectContaining({ npcId: 'npc-a' }),
      expect.objectContaining({ npcId: 'npc-b' }),
    ]);
  });

  it('includes interruptible status from the resolved location state', () => {
    const result = getNpcsAtLocationBySchedule(
      [
        buildNpc({
          npcId: 'npc-a',
          schedule: buildSchedule({
            slots: [
              {
                id: 'study-slot',
                startTime: { hour: 9, minute: 0 },
                endTime: { hour: 17, minute: 0 },
                destination: { type: 'fixed', locationId: 'study' },
                activity: {
                  type: 'studying',
                  description: 'Studying quietly',
                  engagement: 'absorbed',
                },
              },
            ],
          }),
        }),
      ],
      'study',
      { currentTime: at(10) }
    );

    expect(result).toEqual([
      expect.objectContaining({
        npcId: 'npc-a',
        interruptible: false,
      }),
    ]);
  });

  it('returns an empty array when no NPC matches the location', () => {
    const result = getNpcsAtLocationBySchedule(
      [buildNpc({ npcId: 'npc-a', homeLocationId: 'home' })],
      'market',
      { currentTime: at(8) }
    );

    expect(result).toEqual([]);
  });

  it('ignores unresolved NPCs', () => {
    const result = getNpcsAtLocationBySchedule(
      [buildNpc({ npcId: 'npc-a' }), buildNpc({ npcId: 'npc-b', homeLocationId: 'home' })],
      'home',
      { currentTime: at(8) }
    );

    expect(result).toEqual([
      expect.objectContaining({
        npcId: 'npc-b',
      }),
    ]);
  });
});

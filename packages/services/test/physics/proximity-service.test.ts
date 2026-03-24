import { describe, expect, it } from 'vitest';

import { makeEngagementKey } from '@arcagentic/schemas';

import { ProximityService } from '../../src/physics/proximity-service.js';

const service = new ProximityService();

describe('ProximityService state helpers', () => {
  it('creates a default state', () => {
    expect(service.createDefaultState()).toEqual({
      engagements: {},
      npcProximity: {},
    });
  });
});

describe('ProximityService engagement lifecycle', () => {
  it('starts and ends a specific engagement', () => {
    const state = service.createDefaultState();

    service.startEngagement(state, 'npc-1', 'hand', 'touch', 'casual', 1);
    expect(service.hasActiveEngagement(state, 'npc-1')).toBe(true);

    service.endEngagement(state, 'npc-1', 'hand', 'touch', 2);
    expect(service.hasActiveEngagement(state, 'npc-1')).toBe(false);
  });

  it('filters engagements by sense type', () => {
    const state = service.createDefaultState();

    service.startEngagement(state, 'npc-1', 'hand', 'touch', 'casual', 1);
    service.startEngagement(state, 'npc-1', 'hair', 'smell', 'focused', 1);

    expect(service.getFilteredEngagements(state, 'npc-1', { senseType: 'smell' })).toEqual([
      expect.objectContaining({ bodyPart: 'hair' }),
    ]);
  });

  it('filters engagements by body part', () => {
    const state = service.createDefaultState();

    service.startEngagement(state, 'npc-1', 'hand', 'touch', 'casual', 1);
    service.startEngagement(state, 'npc-1', 'hair', 'smell', 'focused', 1);

    expect(service.getFilteredEngagements(state, 'npc-1', { bodyPart: 'hand' })).toEqual([
      expect.objectContaining({ senseType: 'touch' }),
    ]);
  });

  it('filters engagements by minimum intensity', () => {
    const state = service.createDefaultState();

    service.startEngagement(state, 'npc-1', 'hand', 'touch', 'casual', 1);
    service.startEngagement(state, 'npc-1', 'hair', 'smell', 'intimate', 1);

    expect(
      service.getFilteredEngagements(state, 'npc-1', { minIntensity: 'focused' })
    ).toEqual([expect.objectContaining({ intensity: 'intimate' })]);
  });

  it('filters engagements by recent activity', () => {
    const state = service.createDefaultState();
    const key = makeEngagementKey('npc-1', 'hand', 'touch');

    service.startEngagement(state, 'npc-1', 'hand', 'touch', 'casual', 1);
    service.startEngagement(state, 'npc-1', 'hair', 'smell', 'focused', 10);
    service.touchEngagement(state, key, 2);

    expect(
      service.getFilteredEngagements(state, 'npc-1', {
        activeWithinTicks: 3,
        currentTick: 10,
      })
    ).toEqual([expect.objectContaining({ bodyPart: 'hair' })]);
  });

  it('returns the highest intensity engagement for an npc', () => {
    const state = service.createDefaultState();

    service.startEngagement(state, 'npc-1', 'hand', 'touch', 'casual', 1);
    service.startEngagement(state, 'npc-1', 'hair', 'smell', 'intimate', 1);

    expect(service.getHighestIntensityEngagement(state, 'npc-1')).toEqual(
      expect.objectContaining({ bodyPart: 'hair', intensity: 'intimate' })
    );
  });

  it('returns undefined when no engagements are active', () => {
    expect(service.getHighestIntensityEngagement(service.createDefaultState(), 'npc-1')).toBeUndefined();
  });
});

describe('ProximityService proximity queries', () => {
  it('checks whether an npc is within a maximum proximity level', () => {
    const state = service.createDefaultState();
    service.setNpcProximityLevel(state, 'npc-1', 'close');

    expect(service.isWithinProximity(state, 'npc-1', 'near')).toBe(true);
    expect(service.isWithinProximity(state, 'npc-1', 'intimate')).toBe(false);
  });

  it('returns a proximity summary', () => {
    const state = service.createDefaultState();
    service.setNpcProximityLevel(state, 'npc-1', 'close');
    service.startEngagement(state, 'npc-1', 'hand', 'touch', 'casual', 1);
    service.startEngagement(state, 'npc-2', 'hair', 'smell', 'focused', 1);

    expect(service.getProximitySummary(state)).toEqual({
      totalEngagements: 2,
      npcsEngaged: ['npc-1', 'npc-2'],
      npcsInProximity: [{ npcId: 'npc-1', level: 'close' }],
    });
  });

  it('cleans up stale engagements by tick threshold', () => {
    const state = service.createDefaultState();
    const staleKey = makeEngagementKey('npc-1', 'hand', 'touch');
    const freshKey = makeEngagementKey('npc-1', 'hair', 'smell');

    service.startEngagement(state, 'npc-1', 'hand', 'touch', 'casual', 1);
    service.startEngagement(state, 'npc-1', 'hair', 'smell', 'focused', 12);

    const result = service.cleanupStaleEngagements(state, 15, 4);

    expect(result).toEqual({ removed: 1, keys: [staleKey] });
    expect(state.engagements[staleKey]).toBeUndefined();
    expect(state.engagements[freshKey]).toBeDefined();
  });
});

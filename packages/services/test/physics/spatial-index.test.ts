import { describe, expect, it } from 'vitest';

import { makeEngagementKey } from '@arcagentic/schemas';

import { SpatialIndex } from '../../src/physics/spatial-index.js';

describe('SpatialIndex.createDefault', () => {
  it('creates an empty proximity state', () => {
    expect(SpatialIndex.createDefault()).toEqual({
      engagements: {},
      npcProximity: {},
    });
  });
});

describe('SpatialIndex proximity levels', () => {
  it('sets a proximity level for an npc', () => {
    const state = SpatialIndex.createDefault();

    const result = SpatialIndex.setNpcProximityLevel(state, 'npc-1', 'near');

    expect(result.success).toBe(true);
    expect(state.npcProximity['npc-1']).toBe('near');
  });

  it('overwrites an existing proximity level', () => {
    const state = SpatialIndex.createDefault();

    SpatialIndex.setNpcProximityLevel(state, 'npc-1', 'near');
    SpatialIndex.setNpcProximityLevel(state, 'npc-1', 'intimate');

    expect(SpatialIndex.getNpcProximityLevel(state, 'npc-1')).toBe('intimate');
  });

  it('reports success when setting an unchanged proximity level', () => {
    const state = SpatialIndex.createDefault();

    SpatialIndex.setNpcProximityLevel(state, 'npc-1', 'near');
    const result = SpatialIndex.setNpcProximityLevel(state, 'npc-1', 'near');

    expect(result.success).toBe(true);
    expect(result.description).toContain('unchanged');
  });

  it('returns undefined for an unknown npc proximity level', () => {
    expect(SpatialIndex.getNpcProximityLevel(SpatialIndex.createDefault(), 'npc-1')).toBeUndefined();
  });
});

describe('SpatialIndex.updateEngagement', () => {
  it('starts a new engagement', () => {
    const state = SpatialIndex.createDefault();

    const result = SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'engage',
      newIntensity: 'casual',
      currentTick: 10,
    });

    expect(result.success).toBe(true);
    expect(result.engagement).toEqual(
      expect.objectContaining({
        npcId: 'npc-1',
        bodyPart: 'hand',
        senseType: 'touch',
        intensity: 'casual',
        startedAt: 10,
        lastActiveAt: 10,
      })
    );
  });

  it('returns the existing engagement when engage is called twice', () => {
    const state = SpatialIndex.createDefault();

    SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'engage',
      newIntensity: 'casual',
      currentTick: 10,
    });

    const result = SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'engage',
      newIntensity: 'focused',
      currentTick: 11,
    });

    expect(result.success).toBe(true);
    expect(result.engagement?.intensity).toBe('casual');
  });

  it('fails to engage when intensity is missing', () => {
    const result = SpatialIndex.updateEngagement(SpatialIndex.createDefault(), {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'engage',
      currentTick: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('newIntensity');
  });

  it('intensifies an existing engagement', () => {
    const state = SpatialIndex.createDefault();

    SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'engage',
      newIntensity: 'casual',
      currentTick: 10,
    });

    const result = SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'intensify',
      newIntensity: 'intimate',
      currentTick: 12,
    });

    expect(result.success).toBe(true);
    expect(result.engagement?.intensity).toBe('intimate');
    expect(result.engagement?.lastActiveAt).toBe(12);
  });

  it('auto-creates an engagement when intensify is called first', () => {
    const state = SpatialIndex.createDefault();

    const result = SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hair',
      senseType: 'smell',
      action: 'intensify',
      newIntensity: 'focused',
      currentTick: 8,
    });

    expect(result.success).toBe(true);
    expect(result.engagement?.intensity).toBe('focused');
  });

  it('fails to intensify when intensity is missing', () => {
    const result = SpatialIndex.updateEngagement(SpatialIndex.createDefault(), {
      npcId: 'npc-1',
      bodyPart: 'hair',
      senseType: 'smell',
      action: 'intensify',
      currentTick: 8,
    });

    expect(result.success).toBe(false);
  });

  it('does not lower intensity when intensify requests the same or lower level', () => {
    const state = SpatialIndex.createDefault();

    SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'engage',
      newIntensity: 'focused',
      currentTick: 10,
    });

    const result = SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'intensify',
      newIntensity: 'casual',
      currentTick: 11,
    });

    expect(result.success).toBe(true);
    expect(result.engagement?.intensity).toBe('focused');
  });

  it('reduces an engagement intensity', () => {
    const state = SpatialIndex.createDefault();

    SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'engage',
      newIntensity: 'intimate',
      currentTick: 10,
    });

    const result = SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'reduce',
      newIntensity: 'focused',
      currentTick: 12,
    });

    expect(result.success).toBe(true);
    expect(result.engagement?.intensity).toBe('focused');
  });

  it('fails to reduce a missing engagement', () => {
    const result = SpatialIndex.updateEngagement(SpatialIndex.createDefault(), {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'reduce',
      newIntensity: 'casual',
      currentTick: 12,
    });

    expect(result.success).toBe(false);
  });

  it('fails when reduce does not lower the intensity', () => {
    const state = SpatialIndex.createDefault();

    SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'engage',
      newIntensity: 'focused',
      currentTick: 10,
    });

    const result = SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'reduce',
      newIntensity: 'intimate',
      currentTick: 11,
    });

    expect(result.success).toBe(false);
  });

  it('ends an existing engagement', () => {
    const state = SpatialIndex.createDefault();
    const key = makeEngagementKey('npc-1', 'hand', 'touch');

    SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'engage',
      newIntensity: 'casual',
      currentTick: 10,
    });

    const result = SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'end',
      currentTick: 11,
    });

    expect(result.success).toBe(true);
    expect(state.engagements[key]).toBeUndefined();
  });

  it('returns success when ending a non-existent engagement', () => {
    const result = SpatialIndex.updateEngagement(SpatialIndex.createDefault(), {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'end',
      currentTick: 11,
    });

    expect(result.success).toBe(true);
  });
});

describe('SpatialIndex engagement queries', () => {
  it('filters engagements by npc id', () => {
    const state = SpatialIndex.createDefault();

    SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'engage',
      newIntensity: 'casual',
      currentTick: 1,
    });
    SpatialIndex.updateEngagement(state, {
      npcId: 'npc-2',
      bodyPart: 'hair',
      senseType: 'smell',
      action: 'engage',
      newIntensity: 'focused',
      currentTick: 1,
    });

    expect(SpatialIndex.getEngagementsForNpc(state, 'npc-1')).toHaveLength(1);
  });

  it('returns recent engagements within the supplied tick window', () => {
    const state = SpatialIndex.createDefault();

    SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'engage',
      newIntensity: 'casual',
      currentTick: 3,
    });
    SpatialIndex.updateEngagement(state, {
      npcId: 'npc-2',
      bodyPart: 'hair',
      senseType: 'smell',
      action: 'engage',
      newIntensity: 'focused',
      currentTick: 8,
    });

    expect(SpatialIndex.getRecentEngagements(state, 10, 3)).toHaveLength(1);
  });

  it('updates lastActiveAt when touching an engagement', () => {
    const state = SpatialIndex.createDefault();
    const key = makeEngagementKey('npc-1', 'hand', 'touch');

    SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'engage',
      newIntensity: 'casual',
      currentTick: 3,
    });

    const result = SpatialIndex.touchEngagement(state, key, 10);

    expect(result.success).toBe(true);
    expect(state.engagements[key]?.lastActiveAt).toBe(10);
  });

  it('fails to touch an unknown engagement', () => {
    const result = SpatialIndex.touchEngagement(
      SpatialIndex.createDefault(),
      makeEngagementKey('npc-1', 'hand', 'touch'),
      10
    );

    expect(result.success).toBe(false);
  });

  it('ends all engagements for a specific npc only', () => {
    const state = SpatialIndex.createDefault();

    SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'engage',
      newIntensity: 'casual',
      currentTick: 1,
    });
    SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hair',
      senseType: 'smell',
      action: 'engage',
      newIntensity: 'focused',
      currentTick: 1,
    });
    SpatialIndex.updateEngagement(state, {
      npcId: 'npc-2',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'engage',
      newIntensity: 'casual',
      currentTick: 1,
    });

    const result = SpatialIndex.endAllEngagementsForNpc(state, 'npc-1');

    expect(result.success).toBe(true);
    expect(SpatialIndex.getEngagementsForNpc(state, 'npc-1')).toHaveLength(0);
    expect(SpatialIndex.getEngagementsForNpc(state, 'npc-2')).toHaveLength(1);
  });
});

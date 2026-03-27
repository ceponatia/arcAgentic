import { describe, it, expect } from 'vitest';
import type {
  WorldEvent,
  StressBehavior,
  SocialPattern,
  AttachmentStyle,
  PersonalityMap,
} from '@arcagentic/schemas';
import {
  bruteProfile,
  diplomatProfile,
  scholarProfile,
  sparseProfile,
} from './fixtures/personality-fixtures.js';
import type { PerceptionContext } from '../../src/npc/types.js';
import {
  computeStressModifier,
  computeSocialModifier,
  computeAttachmentModifier,
  applyPersonalityModifiers,
  isDefaultModifiers,
} from '../../src/npc/personality-modifiers.js';

function createEvent(type: WorldEvent['type']): WorldEvent {
  return {
    type,
    actorId: 'actor-1',
    sessionId: 'session-1',
    timestamp: new Date('2026-03-26T00:00:00.000Z'),
  } as WorldEvent;
}

function createStressBehavior(overrides: Partial<StressBehavior> = {}): StressBehavior {
  return {
    primary: 'freeze',
    threshold: 0.5,
    recoveryRate: 'moderate',
    soothingActivities: [],
    stressIndicators: [],
    ...overrides,
  };
}

function createSocialPattern(overrides: Partial<SocialPattern> = {}): SocialPattern {
  return {
    strangerDefault: 'neutral',
    warmthRate: 'moderate',
    preferredRole: 'supporter',
    conflictStyle: 'diplomatic',
    criticismResponse: 'reflective',
    boundaries: 'healthy',
    ...overrides,
  };
}

function createPerception(
  relevantEvents: WorldEvent[],
  overrides: Partial<PerceptionContext> = {}
): PerceptionContext {
  return {
    relevantEvents,
    nearbyActors: [],
    ...overrides,
  };
}

describe('computeStressModifier', () => {
  it('returns normal urgency and no notes when stress data is missing', () => {
    expect(computeStressModifier(undefined, [])).toEqual({
      urgency: 'normal',
      contextNotes: [],
    });
  });

  it('raises urgency to high for a low stress threshold after damage', () => {
    const result = computeStressModifier(
      createStressBehavior({ threshold: 0.2 }),
      [createEvent('DAMAGED')]
    );

    expect(result).toEqual({
      urgency: 'high',
      contextNotes: ['tends to freeze'],
    });
  });

  it('raises urgency to elevated for a moderate stress threshold after damage', () => {
    const result = computeStressModifier(
      createStressBehavior({ threshold: 0.5 }),
      [createEvent('DAMAGED')]
    );

    expect(result.urgency).toBe('elevated');
  });

  it('keeps urgency normal for a high stress threshold after damage', () => {
    const result = computeStressModifier(
      createStressBehavior({ threshold: 0.8 }),
      [createEvent('DAMAGED')]
    );

    expect(result.urgency).toBe('normal');
  });

  it('treats DIED as a threatening event', () => {
    const result = computeStressModifier(
      createStressBehavior({ threshold: 0.5 }),
      [createEvent('DIED')]
    );

    expect(result.urgency).toBe('elevated');
  });

  it('ignores non-threatening events for urgency changes', () => {
    const result = computeStressModifier(
      createStressBehavior({ threshold: 0.2 }),
      [createEvent('SPOKE')]
    );

    expect(result.urgency).toBe('normal');
  });

  it.each<[
    StressBehavior['primary'],
    string,
  ]>([
    ['fight', 'instinct to fight'],
    ['flight', 'instinct to flee'],
    ['freeze', 'tends to freeze'],
    ['fawn', 'tends to appease'],
  ])('adds the expected context note for primary stress response %s', (primary, note) => {
    const result = computeStressModifier(createStressBehavior({ primary }), []);

    expect(result).toEqual({
      urgency: 'normal',
      contextNotes: [note],
    });
  });
});

describe('computeSocialModifier', () => {
  it('returns neutral social bias and no notes when social data is missing', () => {
    expect(computeSocialModifier(undefined, undefined, [])).toEqual({
      socialBias: 'neutral',
      contextNotes: [],
    });
  });

  it.each<[
    SocialPattern['conflictStyle'],
    'confront' | 'engage' | 'neutral' | 'avoid',
  ]>([
    ['confrontational', 'confront'],
    ['collaborative', 'engage'],
    ['diplomatic', 'neutral'],
    ['avoidant', 'avoid'],
  ])('maps %s conflict style to %s bias', (conflictStyle, socialBias) => {
    const result = computeSocialModifier(
      createSocialPattern({ conflictStyle }),
      undefined,
      []
    );

    expect(result).toEqual({
      socialBias,
      contextNotes: [],
    });
  });

  it('maps passive-aggressive conflict style to withdraw with a note', () => {
    const result = computeSocialModifier(
      createSocialPattern({ conflictStyle: 'passive-aggressive' }),
      undefined,
      []
    );

    expect(result).toEqual({
      socialBias: 'withdraw',
      contextNotes: ['tends toward passive aggression'],
    });
  });

  it.each<[
    SocialPattern['strangerDefault'],
    string[],
  ]>([
    ['welcoming', ['welcoming with strangers']],
    ['guarded', ['guarded with strangers']],
    ['hostile', ['hostile toward strangers']],
    ['neutral', []],
  ])('adds stranger note(s) for %s when a new actor spawns', (strangerDefault, contextNotes) => {
    const result = computeSocialModifier(
      createSocialPattern({ strangerDefault }),
      undefined,
      [createEvent('ACTOR_SPAWN')]
    );

    expect(result.contextNotes).toEqual(contextNotes);
  });

  it('does not add stranger notes without an ACTOR_SPAWN event', () => {
    const result = computeSocialModifier(
      createSocialPattern({ strangerDefault: 'guarded' }),
      undefined,
      [createEvent('SPOKE')]
    );

    expect(result).toEqual({
      socialBias: 'neutral',
      contextNotes: [],
    });
  });
});

describe('computeAttachmentModifier', () => {
  it('returns no modifications when attachment is undefined', () => {
    expect(computeAttachmentModifier(undefined, [])).toEqual({
      urgencyDelta: 0,
      socialBias: null,
      contextNotes: [],
    });
  });

  it('returns no modifications for secure attachment', () => {
    expect(computeAttachmentModifier('secure', [createEvent('ACTOR_DESPAWN')])).toEqual({
      urgencyDelta: 0,
      socialBias: null,
      contextNotes: [],
    });
  });

  it('adds urgency and abandonment note for anxious-preoccupied attachment after departure', () => {
    expect(
      computeAttachmentModifier('anxious-preoccupied', [createEvent('ACTOR_DESPAWN')])
    ).toEqual({
      urgencyDelta: 1,
      socialBias: null,
      contextNotes: ['fears abandonment'],
    });
  });

  it('does not change urgency for anxious-preoccupied attachment without departure', () => {
    expect(
      computeAttachmentModifier('anxious-preoccupied', [createEvent('SPOKE')])
    ).toEqual({
      urgencyDelta: 0,
      socialBias: null,
      contextNotes: [],
    });
  });

  it('adds avoid bias and emotional distance note for dismissive-avoidant attachment during social events', () => {
    expect(
      computeAttachmentModifier('dismissive-avoidant', [createEvent('SPOKE')])
    ).toEqual({
      urgencyDelta: 0,
      socialBias: 'avoid',
      contextNotes: ['maintains emotional distance'],
    });
  });

  it('adds urgency, avoid bias, and a note for fearful-avoidant attachment after departure', () => {
    expect(computeAttachmentModifier('fearful-avoidant', [createEvent('ACTOR_DESPAWN')])).toEqual({
      urgencyDelta: 1,
      socialBias: 'avoid',
      contextNotes: ['conflicted about closeness'],
    });
  });

  it('adds avoid bias without urgency for fearful-avoidant attachment during speech only', () => {
    expect(computeAttachmentModifier('fearful-avoidant', [createEvent('SPOKE')])).toEqual({
      urgencyDelta: 0,
      socialBias: 'avoid',
      contextNotes: [],
    });
  });
});

describe('applyPersonalityModifiers', () => {
  it('returns default modifiers when personality data is missing', () => {
    expect(applyPersonalityModifiers(undefined, createPerception([]))).toEqual({
      urgency: 'normal',
      socialBias: 'neutral',
      contextNotes: [],
    });
  });

  it('combines stress urgency with attachment urgency deltas', () => {
    const personalityMap: PersonalityMap = {
      stress: createStressBehavior({ threshold: 0.5 }),
      attachment: 'anxious-preoccupied',
    };

    const result = applyPersonalityModifiers(
      personalityMap,
      createPerception([createEvent('DAMAGED'), createEvent('ACTOR_DESPAWN')])
    );

    expect(result.urgency).toBe('high');
    expect(result.contextNotes).toEqual(['tends to freeze', 'fears abandonment']);
  });

  it('prefers attachment social bias over the social modifier when attachment supplies one', () => {
    const personalityMap: PersonalityMap = {
      social: createSocialPattern({ conflictStyle: 'confrontational' }),
      attachment: 'dismissive-avoidant',
    };

    const result = applyPersonalityModifiers(
      personalityMap,
      createPerception([createEvent('SPOKE')])
    );

    expect(result.socialBias).toBe('avoid');
  });

  it('uses the social modifier bias when attachment does not override it', () => {
    const personalityMap: PersonalityMap = {
      social: createSocialPattern({ conflictStyle: 'collaborative' }),
      attachment: 'anxious-preoccupied',
    };

    const result = applyPersonalityModifiers(
      personalityMap,
      createPerception([createEvent('SPOKE')])
    );

    expect(result.socialBias).toBe('engage');
  });

  it('merges context notes and keeps the result unique', () => {
    const personalityMap: PersonalityMap = {
      stress: createStressBehavior({ primary: 'fight', threshold: 0.2 }),
      social: createSocialPattern({
        conflictStyle: 'passive-aggressive',
        strangerDefault: 'guarded',
      }),
      attachment: 'dismissive-avoidant',
    };

    const result = applyPersonalityModifiers(
      personalityMap,
      createPerception([
        createEvent('DAMAGED'),
        createEvent('ACTOR_SPAWN'),
        createEvent('SPOKE'),
      ])
    );

    expect(result.contextNotes).toEqual([
      'instinct to fight',
      'tends toward passive aggression',
      'guarded with strangers',
      'maintains emotional distance',
    ]);
    expect(new Set(result.contextNotes).size).toBe(result.contextNotes.length);
  });
});

describe('isDefaultModifiers', () => {
  it('returns true for the default modifier shape', () => {
    expect(
      isDefaultModifiers({
        urgency: 'normal',
        socialBias: 'neutral',
        contextNotes: [],
      })
    ).toBe(true);
  });

  it('returns false when urgency is non-default', () => {
    expect(
      isDefaultModifiers({
        urgency: 'elevated',
        socialBias: 'neutral',
        contextNotes: [],
      })
    ).toBe(false);
  });

  it('returns false when social bias is non-default', () => {
    expect(
      isDefaultModifiers({
        urgency: 'normal',
        socialBias: 'engage',
        contextNotes: [],
      })
    ).toBe(false);
  });

  it('returns false when context notes are present', () => {
    expect(
      isDefaultModifiers({
        urgency: 'normal',
        socialBias: 'neutral',
        contextNotes: ['instinct to fight'],
      })
    ).toBe(false);
  });
});

describe('archetype personality modifier distinction', () => {
  it('distinguishes scholar and brute threat responses after damage', () => {
    const perception = createPerception([createEvent('DAMAGED')]);

    expect(applyPersonalityModifiers(scholarProfile.personalityMap, perception)).toEqual({
      urgency: 'high',
      socialBias: 'avoid',
      contextNotes: ['tends to freeze'],
    });

    expect(applyPersonalityModifiers(bruteProfile.personalityMap, perception)).toEqual({
      urgency: 'high',
      socialBias: 'confront',
      contextNotes: ['instinct to fight'],
    });
  });

  it('elevates diplomat urgency on departures and preserves abandonment context', () => {
    expect(
      applyPersonalityModifiers(
        diplomatProfile.personalityMap,
        createPerception([createEvent('ACTOR_DESPAWN')])
      )
    ).toEqual({
      urgency: 'elevated',
      socialBias: 'engage',
      contextNotes: ['tends to appease', 'fears abandonment'],
    });
  });

  it('keeps sparse profiles at default modifiers regardless of events', () => {
    expect(
      applyPersonalityModifiers(
        sparseProfile.personalityMap,
        createPerception([
          createEvent('DAMAGED'),
          createEvent('SPOKE'),
          createEvent('ACTOR_DESPAWN'),
        ])
      )
    ).toEqual({
      urgency: 'normal',
      socialBias: 'neutral',
      contextNotes: [],
    });
  });
});

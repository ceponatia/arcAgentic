import { describe, expect, it } from 'vitest';
import type { CharacterProfile } from '@arcagentic/schemas';
import { getAppealTagDefinition } from '@arcagentic/schemas';

import {
  buildAppealPromptSection,
  findTriggeredAppealTags,
  renderAppealPromptAmendment,
  resolveAppealSensoryDetail,
} from '../../src/npc/appeal-tags.js';

function createProfile(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char-001',
    name: 'Mara',
    summary: 'A guarded sentinel who chooses her words carefully.',
    backstory: 'Mara survived a long border war and now trusts slowly.',
    ...overrides,
  } as CharacterProfile;
}

function createRichNpcProfile(): CharacterProfile {
  return createProfile({
    body: {
      hair: {
        scent: { primary: 'lavender', intensity: 0.4 },
        texture: { primary: 'silky', temperature: 'warm', moisture: 'normal' },
      },
      leftHand: {
        scent: { primary: 'cedar', intensity: 0.2 },
        texture: { primary: 'calloused', temperature: 'warm', moisture: 'dry' },
      },
      rightHand: {
        texture: { primary: 'steady', temperature: 'warm', moisture: 'normal' },
        visual: { description: 'scarred knuckles' },
      },
    },
  });
}

function createSparseNpcProfile(): CharacterProfile {
  return createProfile();
}

function buildPromptFlow(
  playerMessage: string,
  activeTagIds: string[],
  npcProfile: CharacterProfile,
  recentEvents: string[] = [],
): {
  triggeredTags: ReturnType<typeof findTriggeredAppealTags>;
  promptSection: string | null;
} {
  const triggeredTags = findTriggeredAppealTags(
    playerMessage,
    recentEvents,
    activeTagIds,
  );

  return {
    triggeredTags,
    promptSection: buildAppealPromptSection(
      triggeredTags,
      npcProfile,
      npcProfile.name ?? 'NPC',
    ),
  };
}

describe('findTriggeredAppealTags', () => {
  it('prefers exact phrase matches over substring matches', () => {
    const matches = findTriggeredAppealTags(
      'I want to touch hair and get closer.',
      ['The warmth of her body lingers in the room.'],
      ['warmth', 'hair'],
    );

    expect(matches).toHaveLength(2);
    expect(matches[0]?.definition.id).toBe('hair');
    expect(matches[0]?.matchedKeyword).toBe('touch hair');
    expect(matches[0]?.matchQuality).toBe('exact');
    expect(matches[1]?.definition.id).toBe('warmth');
    expect(matches[1]?.matchQuality).toBe('substring');
  });

  it('returns an empty array when nothing matches', () => {
    expect(
      findTriggeredAppealTags(
        'Tell me about the weather.',
        ['MOVED from player'],
        ['hair', 'eyes'],
      ),
    ).toEqual([]);
  });

  it('caps matches at two tags per turn', () => {
    const matches = findTriggeredAppealTags(
      'I want to touch hair, kiss her lips, and hold hands.',
      [],
      ['hair', 'lips', 'hands'],
    );

    expect(matches).toHaveLength(2);
    expect(matches.map((match) => match.definition.id)).toEqual(['hair', 'lips']);
  });

  it('de-duplicates duplicate tag ids', () => {
    const matches = findTriggeredAppealTags(
      'I want to touch hair again.',
      [],
      ['hair', 'hair'],
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]?.definition.id).toBe('hair');
  });
});

describe('resolveAppealSensoryDetail', () => {
  it('builds a compact detail phrase from body-map data', () => {
    const hairTag = getAppealTagDefinition('hair');
    expect(hairTag).toBeDefined();

    const detail = resolveAppealSensoryDetail(
      hairTag!,
      createProfile({
        body: {
          hair: {
            scent: { primary: 'lavender', intensity: 0.4 },
            texture: { primary: 'silky', temperature: 'warm', moisture: 'normal' },
          },
        },
      }),
    );

    expect(detail).toBe('warm, silky texture and lavender scent');
  });

  it('falls back to the tag label when no body data exists', () => {
    const neckTag = getAppealTagDefinition('neck');
    expect(neckTag).toBeDefined();

    expect(resolveAppealSensoryDetail(neckTag!, createProfile())).toBe('neck');
  });
});

describe('renderAppealPromptAmendment', () => {
  it('substitutes template placeholders', () => {
    const hairTag = getAppealTagDefinition('hair');
    expect(hairTag).toBeDefined();

    const amendment = renderAppealPromptAmendment(
      hairTag!,
      'Mara',
      'warm, silky texture and lavender scent',
    );

    expect(amendment).toContain("Mara's hair");
    expect(amendment).toContain('warm, silky texture and lavender scent');
    expect(amendment).not.toContain('{npcName}');
  });
});

describe('buildAppealPromptSection', () => {
  it('returns null when no tags were triggered', () => {
    expect(buildAppealPromptSection([], createProfile(), 'Mara')).toBeNull();
  });

  it('returns a formatted sensory focus section with bullet points', () => {
    const hairTag = getAppealTagDefinition('hair');
    const handsTag = getAppealTagDefinition('hands');
    expect(hairTag).toBeDefined();
    expect(handsTag).toBeDefined();

    const section = buildAppealPromptSection(
      [
        {
          definition: hairTag!,
          matchedKeyword: 'touch hair',
          matchQuality: 'exact',
        },
        {
          definition: handsTag!,
          matchedKeyword: 'hold hands',
          matchQuality: 'exact',
        },
      ],
      createProfile({
        body: {
          hair: {
            scent: { primary: 'lavender', intensity: 0.4 },
            texture: { primary: 'silky', temperature: 'warm', moisture: 'normal' },
          },
          leftHand: {
            texture: { primary: 'calloused', temperature: 'warm', moisture: 'dry' },
          },
        },
      }),
      'Mara',
    );

    expect(section).toContain('Sensory focus:');
    expect(section).toContain("- The player is especially drawn to Mara's hair.");
    expect(section).toContain("- The player is especially drawn to Mara's hands.");
  });
});

describe('prompt integration', () => {
  it('returns null when no appeal tags are active', () => {
    expect(buildAppealPromptSection([], createRichNpcProfile(), 'Mara')).toBeNull();
  });

  it('returns no triggered tags when active appeal tags are not referenced', () => {
    const { triggeredTags, promptSection } = buildPromptFlow(
      'Tell me about the patrol route and the weather outside.',
      ['hair', 'hands'],
      createRichNpcProfile(),
    );

    expect(triggeredTags).toEqual([]);
    expect(promptSection).toBeNull();
  });

  it('builds a sensory focus section from one triggered tag with rich npc body data', () => {
    const { triggeredTags, promptSection } = buildPromptFlow(
      'I want to touch hair softly.',
      ['hair'],
      createRichNpcProfile(),
    );

    expect(triggeredTags).toHaveLength(1);
    expect(triggeredTags[0]?.definition.id).toBe('hair');
    expect(promptSection).toContain('Sensory focus:');
    expect(promptSection).toContain("Mara's hair");
    expect(promptSection).toContain('warm, silky texture and lavender scent');
  });

  it('falls back to the generic tag label when one triggered tag has sparse npc data', () => {
    const { triggeredTags, promptSection } = buildPromptFlow(
      'I want to kiss neck and stay close.',
      ['neck'],
      createSparseNpcProfile(),
    );

    expect(triggeredTags).toHaveLength(1);
    expect(triggeredTags[0]?.definition.id).toBe('neck');
    expect(promptSection).toContain('Sensory focus:');
    expect(promptSection).toContain("Mara's neck");
    expect(promptSection).toContain('such as neck');
  });

  it('caps multiple triggered tags at two', () => {
    const { triggeredTags } = buildPromptFlow(
      'I want to touch hair, kiss her lips, and hold hands while feeling her warm body.',
      ['hair', 'lips', 'hands', 'warmth'],
      createRichNpcProfile(),
    );

    expect(triggeredTags).toHaveLength(2);
    expect(triggeredTags.map((match) => match.definition.id)).toEqual(['hair', 'lips']);
  });

  it('de-duplicates a tag when multiple keywords trigger it', () => {
    const { triggeredTags, promptSection } = buildPromptFlow(
      'I brush hair back, then smell hair again before I touch hair once more.',
      ['hair'],
      createRichNpcProfile(),
    );

    expect(triggeredTags).toHaveLength(1);
    expect(triggeredTags[0]?.definition.id).toBe('hair');
    expect(promptSection?.match(/Mara's hair/g)).toHaveLength(1);
  });
});

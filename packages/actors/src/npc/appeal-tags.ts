import type {
  BodyRegionData,
  CharacterProfile,
  AppealTagDefinition,
  RegionTexture,
} from '@arcagentic/schemas';
import {
  BUILT_IN_APPEAL_TAGS,
  getAppealTagDefinition,
  getRecordOptional,
} from '@arcagentic/schemas';

const MAX_TRIGGERED_APPEAL_TAGS = 2;
const MATCH_QUALITY_PRIORITY = {
  exact: 0,
  substring: 1,
} as const;

const BUILT_IN_APPEAL_TAG_ORDER = new Map(
  BUILT_IN_APPEAL_TAGS.map((tag, index) => [tag.id, index] as const),
);

export interface TriggeredAppealTag {
  definition: AppealTagDefinition;
  matchedKeyword: string;
  matchQuality: 'exact' | 'substring';
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isExactPhraseMatch(text: string, keyword: string): boolean {
  if (!text || !keyword) {
    return false;
  }

  const pattern = new RegExp(
    `(^|[^a-z0-9])${escapeRegExp(keyword)}($|[^a-z0-9])`,
    'i',
  );

  return pattern.test(text);
}

function getMatchQuality(
  texts: readonly string[],
  keyword: string,
): 'exact' | 'substring' | null {
  if (texts.some((text) => isExactPhraseMatch(text, keyword))) {
    return 'exact';
  }

  if (texts.some((text) => text.includes(keyword))) {
    return 'substring';
  }

  return null;
}

function isBetterMatch(
  candidate: TriggeredAppealTag,
  existing: TriggeredAppealTag | undefined,
): boolean {
  if (!existing) {
    return true;
  }

  return (
    MATCH_QUALITY_PRIORITY[candidate.matchQuality] <
    MATCH_QUALITY_PRIORITY[existing.matchQuality]
  );
}

function joinDescriptors(descriptors: readonly string[]): string {
  if (descriptors.length === 0) {
    return '';
  }

  if (descriptors.length === 1) {
    return descriptors[0] ?? '';
  }

  return `${descriptors[0]} and ${descriptors[1]}`;
}

function formatTextureDetail(texture: RegionTexture): string {
  const qualifiers: string[] = [];

  if (texture.temperature && texture.temperature !== 'neutral') {
    qualifiers.push(texture.temperature);
  }

  qualifiers.push(texture.primary);
  return `${qualifiers.join(', ')} texture`;
}

function buildSensoryPhrase(
  regionData: BodyRegionData,
): { phrase: string; richness: number } | null {
  const descriptors: string[] = [];

  if (regionData.texture?.primary) {
    descriptors.push(formatTextureDetail(regionData.texture));
  }

  if (regionData.scent?.primary) {
    descriptors.push(`${regionData.scent.primary} scent`);
  }

  if (regionData.visual?.description) {
    descriptors.push(regionData.visual.description.trim());
  }

  if (regionData.flavor?.primary) {
    descriptors.push(`${regionData.flavor.primary} taste`);
  }

  if (descriptors.length === 0) {
    return null;
  }

  return {
    phrase: joinDescriptors(descriptors.slice(0, 2)),
    richness: descriptors.length,
  };
}

/**
 * Finds active appeal tags that were triggered by the player's latest speech or recent context.
 */
export function findTriggeredAppealTags(
  playerMessage: string,
  recentEvents: string[],
  activeTagIds: string[],
): TriggeredAppealTag[] {
  if (activeTagIds.length === 0) {
    return [];
  }

  const searchTexts = [playerMessage, ...recentEvents]
    .map(normalizeText)
    .filter((text) => text.length > 0);

  if (searchTexts.length === 0) {
    return [];
  }

  const triggeredById = new Map<string, TriggeredAppealTag>();

  for (const tagId of activeTagIds) {
    const definition = getAppealTagDefinition(tagId);
    if (!definition) {
      continue;
    }

    for (const triggerKeyword of definition.triggerKeywords) {
      const normalizedKeyword = normalizeText(triggerKeyword);
      const matchQuality = getMatchQuality(searchTexts, normalizedKeyword);
      if (!matchQuality) {
        continue;
      }

      const candidate: TriggeredAppealTag = {
        definition,
        matchedKeyword: triggerKeyword,
        matchQuality,
      };

      const existing = triggeredById.get(definition.id);
      if (isBetterMatch(candidate, existing)) {
        triggeredById.set(definition.id, candidate);
      }
    }
  }

  return [...triggeredById.values()]
    .sort((left, right) => {
      const qualityComparison =
        MATCH_QUALITY_PRIORITY[left.matchQuality] -
        MATCH_QUALITY_PRIORITY[right.matchQuality];
      if (qualityComparison !== 0) {
        return qualityComparison;
      }

      return (
        (BUILT_IN_APPEAL_TAG_ORDER.get(left.definition.id) ?? Number.MAX_SAFE_INTEGER) -
        (BUILT_IN_APPEAL_TAG_ORDER.get(right.definition.id) ?? Number.MAX_SAFE_INTEGER)
      );
    })
    .slice(0, MAX_TRIGGERED_APPEAL_TAGS);
}

/**
 * Resolves a compact sensory phrase for the NPC feature associated with an appeal tag.
 */
export function resolveAppealSensoryDetail(
  tag: AppealTagDefinition,
  npcProfile: CharacterProfile,
): string {
  const body = npcProfile.body;
  if (!body || tag.bodyRegions.length === 0) {
    return tag.label.toLowerCase();
  }

  let bestPhrase: { phrase: string; richness: number } | null = null;

  for (const region of tag.bodyRegions) {
    const regionData = getRecordOptional(body, region);
    if (!regionData) {
      continue;
    }

    const sensoryPhrase = buildSensoryPhrase(regionData);
    if (!sensoryPhrase) {
      continue;
    }

    if (!bestPhrase || sensoryPhrase.richness > bestPhrase.richness) {
      bestPhrase = sensoryPhrase;
    }
  }

  return bestPhrase?.phrase ?? tag.label.toLowerCase();
}

/**
 * Renders a single appeal-tag prompt amendment from the tag template.
 */
export function renderAppealPromptAmendment(
  tag: AppealTagDefinition,
  npcName: string,
  sensoryDetail: string,
): string {
  return tag.promptTemplate
    .replaceAll('{npcName}', npcName)
    .replaceAll('{featureLabel}', tag.label.toLowerCase())
    .replaceAll('{sensoryDetail}', sensoryDetail);
}

/**
 * Builds the prompt section that tells the LLM which player-specific sensory hooks matter this turn.
 */
export function buildAppealPromptSection(
  triggeredTags: TriggeredAppealTag[],
  npcProfile: CharacterProfile,
  npcName: string,
): string | null {
  if (triggeredTags.length === 0) {
    return null;
  }

  const amendments = triggeredTags.map((triggeredTag) => {
    const sensoryDetail = resolveAppealSensoryDetail(
      triggeredTag.definition,
      npcProfile,
    );

    return renderAppealPromptAmendment(
      triggeredTag.definition,
      npcName,
      sensoryDetail,
    );
  });

  if (amendments.length === 0) {
    return null;
  }

  return ['Sensory focus:', ...amendments.map((amendment) => `- ${amendment}`)].join(
    '\n',
  );
}

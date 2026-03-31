import {
  ALIGNMENTS,
  CharacterProfileSchema,
  GENDERS,
  PersonalityMapSchema,
  PhysiqueSchema,
  RACES,
  type Alignment,
  type CharacterDetail,
  type CharacterProfile,
  type Gender,
  type NpcGenerationRequest,
  type NpcGenerationResult,
  type NpcGenerationStrategy,
  type PersonalityMap,
  type Physique,
} from '@arcagentic/schemas';

const NPC_TIER_TAGS = new Set(['transient', 'background', 'minor', 'major']);

function matchEnumValue<T extends readonly string[]>(
  value: string | undefined,
  choices: T,
): T[number] | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return choices.find((choice) => choice.toLowerCase() === normalized);
}

function buildDetailLabel(value: string, index: number): string {
  const candidate = value
    .split(/[.!?:]/, 1)
    .map((part) => part.trim())
    .find(Boolean);

  return candidate?.slice(0, 80) ?? `detail-${index + 1}`;
}

export function parseJsonResponse(content: string | null): unknown {
  if (!content) {
    throw new Error('LLM response content was empty.');
  }

  return JSON.parse(content);
}

export function normalizeNpcTags(
  tags: string[] | undefined,
  tier: NpcGenerationRequest['tier'],
): string[] {
  const normalized = (tags ?? []).filter((tag) => !NPC_TIER_TAGS.has(tag));

  if (!normalized.includes('generated')) {
    normalized.unshift('generated');
  }
  if (!normalized.includes(tier)) {
    normalized.push(tier);
  }

  return normalized;
}

export function finalizeProfile(
  profile: CharacterProfile,
  tier: NpcGenerationRequest['tier'],
): CharacterProfile {
  return CharacterProfileSchema.parse({
    ...profile,
    tier,
    tags: normalizeNpcTags(profile.tags, tier),
  });
}

export function buildResult(
  profile: CharacterProfile,
  requestedTier: NpcGenerationRequest['tier'],
  resolvedTier: NpcGenerationRequest['tier'],
  strategy: NpcGenerationStrategy,
  usedFallback: boolean,
  generatedAt = new Date().toISOString(),
): NpcGenerationResult {
  return {
    profile: finalizeProfile(profile, resolvedTier),
    meta: {
      requestedTier,
      resolvedTier,
      strategy,
      usedFallback,
      generatedAt,
    },
  };
}

export function retierResult(
  result: NpcGenerationResult,
  requestedTier: NpcGenerationRequest['tier'],
  resolvedTier: NpcGenerationRequest['tier'],
  strategy: NpcGenerationStrategy,
  usedFallback: boolean,
): NpcGenerationResult {
  return buildResult(
    CharacterProfileSchema.parse(result.profile),
    requestedTier,
    resolvedTier,
    strategy,
    usedFallback,
    result.meta.generatedAt,
  );
}

export function coerceAge(value: string | number | undefined): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

export function coerceGender(value: string | undefined): Gender | undefined {
  return matchEnumValue(value, GENDERS);
}

export function coerceRace(value: string | undefined): CharacterProfile['race'] | undefined {
  return matchEnumValue(value, RACES);
}

export function coerceAlignment(value: string | undefined): Alignment | undefined {
  return matchEnumValue(value, ALIGNMENTS);
}

export function detailsFromStrings(
  values: string[] | undefined,
  area: CharacterDetail['area'] = 'custom',
): CharacterDetail[] | undefined {
  const normalized = (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8);

  if (!normalized.length) {
    return undefined;
  }

  return normalized.map((value, index) => ({
    label: buildDetailLabel(value, index),
    value,
    area,
    importance: 0.65,
    tags: ['generated'],
  }));
}

export function parsePersonalityMap(value: unknown): PersonalityMap | undefined {
  const parsed = PersonalityMapSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parsePhysique(value: unknown): Physique | undefined {
  const parsed = PhysiqueSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

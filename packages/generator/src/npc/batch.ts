import {
  BatchGenerationRequestSchema,
  BatchGenerationResultSchema,
  type BatchGenerationRequest,
  type BatchGenerationResult,
  type CharacterProfile,
  type NpcGenerationContext,
  type NpcGenerationResult,
} from '@arcagentic/schemas';
import { generateNpc } from './pipeline.js';
import type { NpcGenDeps } from './types.js';

type GeneratorNpcTier = 'transient' | 'background' | 'minor' | 'major';

const GENERATION_ORDER: readonly GeneratorNpcTier[] = ['transient', 'background', 'minor', 'major'];

const TIER_RETRY_PRIORITY: Record<GeneratorNpcTier, number> = {
  transient: 0,
  background: 1,
  minor: 2,
  major: 3,
};

interface BatchEntry {
  requestedTier: GeneratorNpcTier;
  result: NpcGenerationResult;
}

function createTierCountRecord(): Record<GeneratorNpcTier, number> {
  return {
    transient: 0,
    background: 0,
    minor: 0,
    major: 0,
  };
}

function normalizeText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : undefined;
}

function getRequestedCounts(
  counts: BatchGenerationRequest['counts'],
): Record<GeneratorNpcTier, number> {
  const requested = createTierCountRecord();

  for (const tier of GENERATION_ORDER) {
    switch (tier) {
      case 'transient':
        requested.transient = counts.transient ?? 0;
        break;
      case 'background':
        requested.background = counts.background ?? 0;
        break;
      case 'minor':
        requested.minor = counts.minor ?? 0;
        break;
      case 'major':
        requested.major = counts.major ?? 0;
        break;
    }
  }

  return requested;
}

function getTierCount(counts: Record<GeneratorNpcTier, number>, tier: GeneratorNpcTier): number {
  switch (tier) {
    case 'transient':
      return counts.transient;
    case 'background':
      return counts.background;
    case 'minor':
      return counts.minor;
    case 'major':
      return counts.major;
  }
}

function incrementTierCount(
  counts: Record<GeneratorNpcTier, number>,
  tier: GeneratorNpcTier,
): void {
  switch (tier) {
    case 'transient':
      counts.transient += 1;
      break;
    case 'background':
      counts.background += 1;
      break;
    case 'minor':
      counts.minor += 1;
      break;
    case 'major':
      counts.major += 1;
      break;
  }
}

function getTierRetryPriority(tier: GeneratorNpcTier): number {
  switch (tier) {
    case 'transient':
      return TIER_RETRY_PRIORITY.transient;
    case 'background':
      return TIER_RETRY_PRIORITY.background;
    case 'minor':
      return TIER_RETRY_PRIORITY.minor;
    case 'major':
      return TIER_RETRY_PRIORITY.major;
  }
}

function toExistingNpcSummary(
  profile: CharacterProfile,
  requestedTier: GeneratorNpcTier,
): NonNullable<NpcGenerationContext['existingNpcs']>[number] {
  return {
    name: profile.name,
    race: profile.race,
    gender: profile.gender,
    occupation: profile.occupation,
    tier: profile.tier ?? requestedTier,
  };
}

function buildArchetypeHint(
  baseArchetype: string | undefined,
  hint: string | undefined,
): string | undefined {
  const parts = [baseArchetype, hint].filter(Boolean);
  return parts.length ? parts.join(' | ') : undefined;
}

function buildGenerationContext(
  baseContext: BatchGenerationRequest['context'],
  entries: BatchEntry[],
  archetypeHint?: string,
  excludeIndex?: number,
): BatchGenerationRequest['context'] {
  const existingNpcs = [
    ...(baseContext.existingNpcs ?? []),
    ...entries
      .filter((_, index) => index !== excludeIndex)
      .map((entry) => toExistingNpcSummary(entry.result.profile as CharacterProfile, entry.requestedTier)),
  ];

  return {
    ...baseContext,
    existingNpcs: existingNpcs.length ? existingNpcs : undefined,
    archetype: buildArchetypeHint(baseContext.archetype, archetypeHint),
  };
}

async function regenerateEntry(
  entries: BatchEntry[],
  index: number,
  baseContext: BatchGenerationRequest['context'],
  allowFallback: boolean,
  deps: NpcGenDeps | undefined,
  archetypeHint: string,
): Promise<void> {
  const current = entries.at(index);

  if (!current) {
    return;
  }

  const regenerated: NpcGenerationResult = await generateNpc(
    {
      tier: current.requestedTier,
      context: buildGenerationContext(baseContext, entries, archetypeHint, index),
      allowFallback,
    },
    deps,
  );

  entries.splice(index, 1, {
    requestedTier: current.requestedTier,
    result: regenerated,
  });
}

function getDuplicateNameIndices(entries: BatchEntry[]): number[] {
  const seen = new Set<string>();
  const duplicates: number[] = [];

  entries.forEach((entry, index) => {
    const normalized = normalizeText((entry.result.profile as CharacterProfile).name);

    if (!normalized) {
      return;
    }

    if (seen.has(normalized)) {
      duplicates.push(index);
      return;
    }

    seen.add(normalized);
  });

  return duplicates;
}

function buildUniqueNameHint(entries: BatchEntry[], index: number): string {
  const usedNames = entries
    .filter((_, entryIndex) => entryIndex !== index)
    .map((entry) => (entry.result.profile as CharacterProfile).name)
    .filter((name): name is string => Boolean(name?.trim()));

  return usedNames.length
    ? `Diversity requirement: choose a distinct name and avoid these names when possible: ${usedNames.join(', ')}.`
    : 'Diversity requirement: choose a distinct name from the current cast.';
}

async function enforceUniqueNames(
  entries: BatchEntry[],
  baseContext: BatchGenerationRequest['context'],
  allowFallback: boolean,
  deps: NpcGenDeps | undefined,
): Promise<void> {
  const duplicateIndices = getDuplicateNameIndices(entries);

  for (const index of duplicateIndices) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await regenerateEntry(
        entries,
        index,
        baseContext,
        allowFallback,
        deps,
        buildUniqueNameHint(entries, index),
      );

      if (!getDuplicateNameIndices(entries).includes(index)) {
        break;
      }
    }
  }
}

function getUniqueValueCount(
  entries: BatchEntry[],
  selector: (profile: CharacterProfile) => string | undefined,
): number {
  const values = entries
    .map((entry) => selector(entry.result.profile as CharacterProfile))
    .map((value) => normalizeText(value))
    .filter((value): value is string => Boolean(value));

  return new Set(values).size;
}

function buildValueFrequencies(
  entries: BatchEntry[],
  selector: (profile: CharacterProfile) => string | undefined,
): Map<string, number> {
  const counts = new Map<string, number>();

  entries.forEach((entry) => {
    const value = normalizeText(selector(entry.result.profile as CharacterProfile));

    if (!value) {
      return;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return counts;
}

function selectCandidateIndex(
  entries: BatchEntry[],
  selector: (profile: CharacterProfile) => string | undefined,
): number | undefined {
  const frequencies = buildValueFrequencies(entries, selector);

  return entries
    .map((entry, index) => {
      const profile = entry.result.profile as CharacterProfile;
      const normalizedValue = normalizeText(selector(profile));

      return {
        index,
        isBlank: !normalizedValue,
        frequency: normalizedValue ? (frequencies.get(normalizedValue) ?? 0) : Number.MAX_SAFE_INTEGER,
        tierPriority: getTierRetryPriority(entry.requestedTier),
      };
    })
    .sort((left, right) => {
      if (left.isBlank !== right.isBlank) {
        return left.isBlank ? -1 : 1;
      }
      if (left.frequency !== right.frequency) {
        return right.frequency - left.frequency;
      }
      if (left.tierPriority !== right.tierPriority) {
        return left.tierPriority - right.tierPriority;
      }

      return right.index - left.index;
    })[0]?.index;
}

function buildDiversityHint(
  label: 'race' | 'gender' | 'occupation',
  entries: BatchEntry[],
  index: number,
): string {
  const values = entries
    .filter((_, entryIndex) => entryIndex !== index)
    .map((entry) => {
      const profile = entry.result.profile as CharacterProfile;

      switch (label) {
        case 'race':
          return profile.race;
        case 'gender':
          return profile.gender;
        case 'occupation':
          return profile.occupation;
      }
    })
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  const qualifier = label === 'occupation' ? 'role or occupation' : label;

  return values.length
    ? `Diversity requirement: prefer a ${qualifier} distinct from the current cast. Avoid these existing ${label}s when possible: ${values.join(', ')}.`
    : `Diversity requirement: prefer a ${qualifier} distinct from the current cast.`;
}

async function enforceMinimumUniqueValues(
  entries: BatchEntry[],
  baseContext: BatchGenerationRequest['context'],
  allowFallback: boolean,
  deps: NpcGenDeps | undefined,
  minimum: number | undefined,
  label: 'race' | 'gender' | 'occupation',
  selector: (profile: CharacterProfile) => string | undefined,
): Promise<void> {
  if (!minimum || minimum <= 0 || !entries.length) {
    return;
  }

  let attempts = 0;
  while (getUniqueValueCount(entries, selector) < minimum && attempts < 3) {
    const candidateIndex = selectCandidateIndex(entries, selector);

    if (candidateIndex === undefined) {
      break;
    }

    attempts += 1;
    await regenerateEntry(
      entries,
      candidateIndex,
      baseContext,
      allowFallback,
      deps,
      buildDiversityHint(label, entries, candidateIndex),
    );
  }
}

function getGeneratedCounts(entries: BatchEntry[]): Record<GeneratorNpcTier, number> {
  const generated = createTierCountRecord();

  for (const entry of entries) {
    incrementTierCount(generated, entry.result.meta.resolvedTier);
  }

  return generated;
}

function getFallbackCount(entries: BatchEntry[]): number {
  return entries.filter((entry) => entry.result.meta.usedFallback).length;
}

/**
 * Generate a batch of NPCs with tier ordering and best-effort diversity enforcement.
 */
export async function generateNpcBatch(
  request: BatchGenerationRequest,
  deps?: NpcGenDeps,
): Promise<BatchGenerationResult> {
  BatchGenerationRequestSchema.parse(request);
  const parsed = request;
  const requestedCounts = getRequestedCounts(parsed.counts);
  const entries: BatchEntry[] = [];

  for (const tier of GENERATION_ORDER) {
    const count = getTierCount(requestedCounts, tier);

    for (let index = 0; index < count; index += 1) {
      const result: NpcGenerationResult = await generateNpc(
        {
          tier,
          context: buildGenerationContext(parsed.context, entries),
          allowFallback: parsed.allowFallback,
        },
        deps,
      );

      entries.push({
        requestedTier: tier,
        result,
      });
    }
  }

  if (parsed.diversity?.uniqueNames) {
    await enforceUniqueNames(entries, parsed.context, parsed.allowFallback, deps);
  }

  await enforceMinimumUniqueValues(
    entries,
    parsed.context,
    parsed.allowFallback,
    deps,
    parsed.diversity?.minUniqueRaces,
    'race',
    (profile) => profile.race,
  );

  await enforceMinimumUniqueValues(
    entries,
    parsed.context,
    parsed.allowFallback,
    deps,
    parsed.diversity?.minUniqueGenders,
    'gender',
    (profile) => profile.gender,
  );

  await enforceMinimumUniqueValues(
    entries,
    parsed.context,
    parsed.allowFallback,
    deps,
    parsed.diversity?.minUniqueOccupations,
    'occupation',
    (profile) => profile.occupation,
  );

  return BatchGenerationResultSchema.parse({
    npcs: entries.map((entry) => entry.result.profile),
    meta: {
      requested: requestedCounts,
      generated: getGeneratedCounts(entries),
      llmFallbacks: getFallbackCount(entries),
      generatedAt: new Date().toISOString(),
    },
  });
}

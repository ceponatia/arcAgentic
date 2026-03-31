import { Effect } from 'effect';
import { z } from 'zod';
import type { ChatOptions, LLMResponse, LlmCognitionTask } from '@arcagentic/llm';
import {
  CharacterProfileSchema,
  NpcExpansionRequestSchema,
  getFieldsToGenerate,
  getNextTier,
  type CharacterDetail,
  type CharacterProfile,
  type NpcExpansionRequest,
  type NpcGenerationResult,
} from '@arcagentic/schemas';
import { buildExpansionPrompt } from './prompts/index.js';
import {
  buildResult,
  detailsFromStrings,
  parseJsonResponse,
  parsePersonalityMap,
} from './strategies/shared.js';
import type { NpcGenDeps } from './types.js';

type ExpansionNpcTier = 'transient' | 'background' | 'minor' | 'major';

const ExpansionOutputSchema = z.object({
  name: z.string().min(1).optional(),
  appearanceSnippet: z.string().min(1).optional(),
  personalityTraits: z.array(z.string().min(1)).min(1).optional(),
  backstory: z.string().min(1).optional(),
  scheduleTemplate: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
  speechPatterns: z.union([z.string().min(1), z.record(z.string(), z.unknown())]).optional(),
  personalityMap: z.record(z.string(), z.unknown()).optional(),
  detailedBackstory: z.string().min(1).optional(),
  detailedSchedule: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
  relationships: z.union([z.array(z.string().min(1)).min(1), z.record(z.string(), z.unknown())]).optional(),
  goals: z.union([z.array(z.string().min(1)).min(1), z.record(z.string(), z.unknown())]).optional(),
  fears: z.union([z.array(z.string().min(1)).min(1), z.record(z.string(), z.unknown())]).optional(),
  values: z.union([z.array(z.string().min(1)).min(1), z.record(z.string(), z.unknown())]).optional(),
});

function isBlankString(value: string | undefined): boolean {
  return !value?.trim();
}

function toExpansionTier(
  tier: CharacterProfile['tier'] | undefined,
): ExpansionNpcTier | undefined {
  switch (tier) {
    case 'transient':
    case 'background':
    case 'minor':
    case 'major':
      return tier;
    default:
      return undefined;
  }
}

function resolveFromTier(profile: CharacterProfile, targetTier: ExpansionNpcTier): ExpansionNpcTier {
  const currentTier = toExpansionTier(profile.tier);

  if (currentTier && getNextTier(currentTier) === targetTier) {
    return currentTier;
  }

  switch (targetTier) {
    case 'background':
      return 'transient';
    case 'minor':
      return 'background';
    case 'major':
      return 'minor';
    case 'transient':
      return 'transient';
  }
}

function getExpansionTaskType(
  fromTier: ExpansionNpcTier,
  targetTier: ExpansionNpcTier,
): LlmCognitionTask['type'] {
  if (fromTier === 'transient' && targetTier === 'background') {
    return 'fast';
  }

  if (fromTier === 'minor' && targetTier === 'major') {
    return 'reasoning';
  }

  return targetTier === 'background' ? 'fast' : 'deep';
}

function getTaskOptions(taskType: LlmCognitionTask['type']): ChatOptions {
  switch (taskType) {
    case 'fast':
      return {
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 400,
      };
    case 'reasoning':
      return {
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1400,
      };
    case 'deep':
    default:
      return {
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 1000,
      };
  }
}

function toStringList(value: unknown): string[] {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean);
  }

  return [];
}

function toDetailStrings(label: string, value: unknown): string[] {
  const list = toStringList(value);

  if (list.length) {
    return list.map((entry) => `${label}: ${entry}`);
  }

  if (value && typeof value === 'object') {
    return [`${label}: ${JSON.stringify(value)}`];
  }

  return [];
}

function mergePersonality(
  existing: CharacterProfile['personality'],
  nextTraits: string[],
): CharacterProfile['personality'] {
  const existingTraits = Array.isArray(existing)
    ? existing
    : typeof existing === 'string' && existing.trim()
      ? [existing.trim()]
      : [];

  const merged = Array.from(new Set([...existingTraits, ...nextTraits.map((trait) => trait.trim())]))
    .filter(Boolean)
    .slice(0, 8);

  if (!merged.length) {
    return existing;
  }

  return merged;
}

function mergeBackstory(
  existing: string,
  addition: string | undefined,
): string {
  const trimmed = addition?.trim();

  if (!trimmed) {
    return existing;
  }

  if (!existing.trim()) {
    return trimmed;
  }

  if (trimmed.includes(existing.trim()) || existing.includes(trimmed)) {
    return trimmed.length >= existing.length ? trimmed : existing;
  }

  return `${existing.trim()}\n\n${trimmed}`;
}

function mergeDetails(
  existing: CharacterDetail[] | undefined,
  additions: string[],
): CharacterDetail[] | undefined {
  if (!additions.length) {
    return existing;
  }

  const generated = detailsFromStrings(additions, 'history') ?? [];
  const combined = [...(existing ?? [])];
  const seen = new Set(combined.map((detail) => `${detail.area}:${detail.value}`));

  for (const detail of generated) {
    const key = `${detail.area}:${detail.value}`;

    if (seen.has(key)) {
      continue;
    }

    combined.push(detail);
    seen.add(key);
  }

  return combined.length ? combined.slice(0, 32) : undefined;
}

function mergeSpeechPatterns(
  existing: CharacterProfile,
  speechPatterns: unknown,
): CharacterProfile {
  if (!speechPatterns || typeof speechPatterns === 'string') {
    return existing;
  }

  const personalityMap = parsePersonalityMap({
    ...(existing.personalityMap ?? {}),
    speech: speechPatterns,
  });

  if (!personalityMap) {
    return existing;
  }

  return {
    ...existing,
    personalityMap,
  };
}

function mergeExpandedProfile(
  existingProfile: CharacterProfile,
  output: z.infer<typeof ExpansionOutputSchema>,
  targetTier: ExpansionNpcTier,
  fieldsToGenerate: string[],
): CharacterProfile {
  let merged: CharacterProfile = {
    ...existingProfile,
  };

  if (fieldsToGenerate.includes('name') && isBlankString(existingProfile.name) && output.name) {
    merged = {
      ...merged,
      name: output.name,
    };
  }

  if (fieldsToGenerate.includes('appearanceSnippet') && output.appearanceSnippet) {
    merged = {
      ...merged,
      summary: output.appearanceSnippet,
      physique: typeof merged.physique === 'string' ? merged.physique : merged.physique ?? output.appearanceSnippet,
    };
  }

  if (fieldsToGenerate.includes('personalityTraits') && output.personalityTraits?.length) {
    merged = {
      ...merged,
      personality: mergePersonality(merged.personality, output.personalityTraits),
    };
  }

  if (fieldsToGenerate.includes('backstory')) {
    merged = {
      ...merged,
      backstory: mergeBackstory(merged.backstory, output.backstory),
    };
  }

  if (fieldsToGenerate.includes('detailedBackstory')) {
    merged = {
      ...merged,
      backstory: mergeBackstory(merged.backstory, output.detailedBackstory),
    };
  }

  if (fieldsToGenerate.includes('personalityMap') && output.personalityMap) {
    const personalityMap = parsePersonalityMap({
      ...(merged.personalityMap ?? {}),
      ...output.personalityMap,
    });

    if (personalityMap) {
      merged = {
        ...merged,
        personalityMap,
      };
    }
  }

  if (fieldsToGenerate.includes('speechPatterns')) {
    merged = mergeSpeechPatterns(merged, output.speechPatterns);
  }

  const supplementalDetails = [
    ...(fieldsToGenerate.includes('scheduleTemplate')
      ? toDetailStrings('Schedule', output.scheduleTemplate)
      : []),
    ...(fieldsToGenerate.includes('detailedSchedule')
      ? toDetailStrings('Detailed schedule', output.detailedSchedule)
      : []),
    ...(fieldsToGenerate.includes('relationships')
      ? toDetailStrings('Relationship', output.relationships)
      : []),
    ...(fieldsToGenerate.includes('goals') ? toDetailStrings('Goal', output.goals) : []),
    ...(fieldsToGenerate.includes('fears') ? toDetailStrings('Fear', output.fears) : []),
    ...(fieldsToGenerate.includes('values') ? toDetailStrings('Value', output.values) : []),
    ...(fieldsToGenerate.includes('speechPatterns') && typeof output.speechPatterns === 'string'
      ? [`Speech pattern: ${output.speechPatterns}`]
      : []),
  ];

  merged = {
    ...merged,
    details: mergeDetails(merged.details, supplementalDetails),
    tier: targetTier,
  };

  const validatedProfile = CharacterProfileSchema.safeParse(merged);

  if (!validatedProfile.success) {
    throw new Error('Expanded NPC profile failed CharacterProfile validation.');
  }

  return validatedProfile.data;
}

function buildFallbackResult(
  existingProfile: CharacterProfile,
  targetTier: ExpansionNpcTier,
): NpcGenerationResult {
  const validatedProfile = CharacterProfileSchema.safeParse({
    ...existingProfile,
    tier: targetTier,
  });

  if (!validatedProfile.success) {
    throw new Error('Fallback NPC profile failed CharacterProfile validation.');
  }

  return buildResult(
    validatedProfile.data,
    targetTier,
    targetTier,
    'llm-author',
    true,
  );
}

/**
 * Expand an NPC profile when promoted to a deeper tier.
 */
export async function expandNpcProfile(
  request: NpcExpansionRequest,
  deps?: NpcGenDeps,
): Promise<NpcGenerationResult> {
  NpcExpansionRequestSchema.parse(request);
  const parsed = request;
  CharacterProfileSchema.parse(parsed.existingProfile);
  const existingProfile = parsed.existingProfile;
  const targetTier = toExpansionTier(parsed.targetTier);

  if (!targetTier) {
    throw new Error('NPC expansion target tier is invalid.');
  }

  const fieldsToGenerate: string[] = parsed.expansionTask?.fieldsToGenerate?.length
    ? parsed.expansionTask.fieldsToGenerate
    : getFieldsToGenerate(targetTier);

  if (!fieldsToGenerate.length || existingProfile.tier === targetTier) {
    const validatedProfile = CharacterProfileSchema.safeParse({
      ...existingProfile,
      tier: targetTier,
    });

    if (!validatedProfile.success) {
      throw new Error('Expanded NPC profile failed CharacterProfile validation.');
    }

    return buildResult(
      validatedProfile.data,
      targetTier,
      targetTier,
      'llm-author',
      false,
    );
  }

  if (!deps?.cognitionRouter) {
    return buildFallbackResult(existingProfile, targetTier);
  }

  const fromTier = resolveFromTier(existingProfile, targetTier);
  const taskType = getExpansionTaskType(fromTier, targetTier);

  try {
    const task: LlmCognitionTask = {
      type: taskType,
      messages: buildExpansionPrompt({
        existingProfile,
        ...(parsed.expansionTask?.existingData
          ? { existingData: parsed.expansionTask.existingData }
          : {}),
        interactionSummary: parsed.interactionSummary,
        fromTier,
        targetTier,
        fieldsToGenerate,
      }),
      options: getTaskOptions(taskType),
    };

    const response: LLMResponse = await Effect.runPromise(deps.cognitionRouter.execute(task));
    const validatedOutput = ExpansionOutputSchema.safeParse(
      parseJsonResponse(response.content),
    );

    if (!validatedOutput.success) {
      throw new Error('Expansion LLM output did not match the expected schema.');
    }

    const output = validatedOutput.data;
    const profile: CharacterProfile = mergeExpandedProfile(
      existingProfile,
      output,
      targetTier,
      fieldsToGenerate,
    );

    return buildResult(profile, targetTier, targetTier, 'llm-author', false);
  } catch {
    return buildFallbackResult(existingProfile, targetTier);
  }
}

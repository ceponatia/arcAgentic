import { Effect } from 'effect';
import { z } from 'zod';
import type { LLMResponse, LlmCognitionTask } from '@arcagentic/llm';
import { CharacterProfileSchema, type CharacterProfile, type NpcGenerationRequest, type NpcGenerationResult } from '@arcagentic/schemas';
import {
  buildMajorBehavioralPrompt,
  buildMajorNarrativePrompt,
  buildMinorAuthorPrompt,
} from '../prompts/index.js';
import type { NpcGenDeps } from '../types.js';
import {
  buildResult,
  coerceAge,
  coerceAlignment,
  coerceGender,
  coerceRace,
  detailsFromStrings,
  parseJsonResponse,
  parsePersonalityMap,
  parsePhysique,
  retierResult,
} from './shared.js';
import { poolLlmRefineStrategy } from './pool-llm-refine.js';
import { poolOnlyStrategy } from './pool-only.js';

const MinorTierAuthorOutputSchema = z.object({
  name: z.string().min(1),
  age: z.union([z.string(), z.number()]).optional(),
  gender: z.string().optional(),
  race: z.string().optional(),
  summary: z.string().min(1),
  backstory: z.string().min(1),
  occupation: z.string().min(1).optional(),
  alignment: z.string().optional(),
  personality: z.array(z.string().min(1)).min(1),
  physique: z
    .object({
      build: z.string().optional(),
      posture: z.string().optional(),
      notableFeatures: z.array(z.string().min(1)).optional(),
    })
    .optional(),
  details: z.array(z.string().min(1)).optional(),
});

const MajorNarrativeOutputSchema = z.object({
  name: z.string().min(1),
  summary: z.string().min(1),
  backstory: z.string().min(1),
  occupation: z.string().min(1).optional(),
  alignment: z.string().optional(),
  personality: z.array(z.string().min(1)).min(1),
  details: z.array(z.string().min(1)).min(1),
});

const MajorBehavioralOutputSchema = z.object({
  personalityMap: z.record(z.string(), z.unknown()).optional(),
  physique: z.record(z.string(), z.unknown()).optional(),
});

function buildMinorPhysiqueText(
  physique: z.infer<typeof MinorTierAuthorOutputSchema>['physique'],
): string | undefined {
  if (!physique) {
    return undefined;
  }

  const parts = [
    physique.build,
    physique.posture ? `posture: ${physique.posture}` : undefined,
    physique.notableFeatures?.length
      ? `features: ${physique.notableFeatures.join(', ')}`
      : undefined,
  ].filter(Boolean);

  return parts.length ? parts.join('; ') : undefined;
}

async function executeJsonTask<T>(
  deps: NpcGenDeps,
  task: LlmCognitionTask,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const router = deps.cognitionRouter;

  if (!router) {
    throw new Error('Npc cognition router dependency is not available.');
  }

  const response: LLMResponse = await Effect.runPromise(router.execute(task));
  return schema.parse(parseJsonResponse(response.content));
}

function buildSeedIdentity(profile: CharacterProfile): Pick<CharacterProfile, 'name' | 'age' | 'gender' | 'race'> {
  return {
    name: profile.name,
    age: profile.age,
    gender: profile.gender,
    race: profile.race,
  };
}

function buildFallbackResult(
  seed: NpcGenerationResult,
  request: NpcGenerationRequest,
): NpcGenerationResult {
  return buildResult(
    CharacterProfileSchema.parse(seed.profile),
    request.tier,
    request.tier,
    'llm-author',
    true,
    seed.meta.generatedAt,
  );
}

async function generateMinor(
  seed: NpcGenerationResult,
  request: NpcGenerationRequest,
  deps: NpcGenDeps,
): Promise<NpcGenerationResult> {
  const seedProfile = CharacterProfileSchema.parse(seed.profile);
  const output = await executeJsonTask(
    deps,
    {
      type: 'deep',
      messages: buildMinorAuthorPrompt(buildSeedIdentity(seedProfile), request.context),
      options: {
        response_format: { type: 'json_object' },
        temperature: 0.9,
        max_tokens: 900,
      },
    },
    MinorTierAuthorOutputSchema,
  );

  const profile = CharacterProfileSchema.parse({
    ...seedProfile,
    name: output.name,
    age: coerceAge(output.age) ?? seedProfile.age,
    gender: coerceGender(output.gender) ?? seedProfile.gender,
    race: coerceRace(output.race) ?? seedProfile.race,
    summary: output.summary,
    backstory: output.backstory,
    occupation: output.occupation ?? seedProfile.occupation,
    alignment: coerceAlignment(output.alignment) ?? seedProfile.alignment,
    personality: output.personality,
    physique: buildMinorPhysiqueText(output.physique) ?? seedProfile.physique,
    details: detailsFromStrings(output.details) ?? seedProfile.details,
  });

  return buildResult(profile, request.tier, 'minor', 'llm-author', false);
}

async function generateMajor(
  seed: NpcGenerationResult,
  request: NpcGenerationRequest,
  deps: NpcGenDeps,
): Promise<NpcGenerationResult> {
  const seedProfile = CharacterProfileSchema.parse(seed.profile);
  const narrative = await executeJsonTask(
    deps,
    {
      type: 'deep',
      messages: buildMajorNarrativePrompt(buildSeedIdentity(seedProfile), request.context),
      options: {
        response_format: { type: 'json_object' },
        temperature: 0.95,
        max_tokens: 1200,
      },
    },
    MajorNarrativeOutputSchema,
  );

  const narrativeProfile = CharacterProfileSchema.parse({
    ...seedProfile,
    name: narrative.name,
    summary: narrative.summary,
    backstory: narrative.backstory,
    occupation: narrative.occupation ?? seedProfile.occupation,
    alignment: coerceAlignment(narrative.alignment) ?? seedProfile.alignment,
    personality: narrative.personality,
    details: detailsFromStrings(narrative.details, 'history') ?? seedProfile.details,
  });

  try {
    const behavioral = await executeJsonTask(
      deps,
      {
        type: 'reasoning',
        messages: buildMajorBehavioralPrompt(
          {
            ...buildSeedIdentity(seedProfile),
            ...narrative,
          },
          request.context,
        ),
        options: {
          response_format: { type: 'json_object' },
          temperature: 0.6,
          max_tokens: 1200,
        },
      },
      MajorBehavioralOutputSchema,
    );
    const personalityMap = parsePersonalityMap(behavioral.personalityMap);
    const physique = parsePhysique(behavioral.physique);
    const profile = CharacterProfileSchema.parse({
      ...narrativeProfile,
      personalityMap: personalityMap ?? narrativeProfile.personalityMap,
      physique: physique ?? narrativeProfile.physique,
    });

    return buildResult(profile, request.tier, 'major', 'llm-author', false);
  } catch {
    return buildResult(narrativeProfile, request.tier, 'major', 'llm-author', true);
  }
}

/**
 * Minor- and major-tier strategy that seeds identity from pools and authors depth with LLM calls.
 */
export async function llmAuthorStrategy(
  request: NpcGenerationRequest,
  deps?: NpcGenDeps,
): Promise<NpcGenerationResult> {
  const seed = await poolOnlyStrategy({ ...request, tier: 'transient' }, deps);

  if (!deps?.cognitionRouter) {
    return buildFallbackResult(seed, request);
  }

  try {
    if (request.tier === 'minor') {
      return await generateMinor(seed, request, deps);
    }

    return await generateMajor(seed, request, deps);
  } catch {
    try {
      const refined = await poolLlmRefineStrategy(request, deps);
      return retierResult(refined, request.tier, request.tier, 'llm-author', true);
    } catch {
      return buildFallbackResult(seed, request);
    }
  }
}
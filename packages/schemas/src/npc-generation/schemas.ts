import { z } from 'zod';
import { CharacterProfileSchema } from '../character/characterProfile.js';
import {
  NpcTierSchema,
  ProfileExpansionTaskSchema,
  TransientNpcProfileSchema,
} from '../npc-tier/schemas.js';

/**
 * Schema for location context used during NPC generation.
 */
export const NpcGenerationLocationContextSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.string(),
  tags: z.array(z.string()),
});

/**
 * Schema for setting context used during NPC generation.
 */
export const NpcGenerationSettingContextSchema = z.object({
  era: z.string(),
  tone: z.string(),
  themes: z.array(z.string()),
});

/**
 * Schema for existing NPC summaries used as generation context.
 */
export const NpcGenerationExistingNpcSchema = z.object({
  name: z.string(),
  race: z.string(),
  gender: z.string().optional(),
  occupation: z.string().optional(),
  tier: NpcTierSchema,
});

/**
 * Schema for player context used during NPC generation.
 */
export const NpcGenerationPlayerContextSchema = z.object({
  level: z.number().optional(),
  currentQuests: z.array(z.string()).optional(),
  recentInteractions: z.array(z.string()).optional(),
});

/**
 * Schema for the contextual inputs used to generate an NPC.
 */
export const NpcGenerationContextSchema = z.object({
  location: NpcGenerationLocationContextSchema.optional(),
  setting: NpcGenerationSettingContextSchema.optional(),
  existingNpcs: z.array(NpcGenerationExistingNpcSchema).optional(),
  player: NpcGenerationPlayerContextSchema.optional(),
  archetype: z.string().optional(),
  nameOverride: z.string().optional(),
});

/**
 * Schema for population density presets.
 */
export const PopulationDensitySchema = z.enum(['sparse', 'normal', 'dense']);

/**
 * Schema for tier distribution weights.
 */
export const TierDistributionSchema = z.object({
  transient: z.number().int().min(0).default(5),
  background: z.number().int().min(0).default(3),
  minor: z.number().int().min(0).default(1),
  major: z.number().int().min(0).default(0),
});

/**
 * Schema for NPC population configuration per session.
 */
export const NpcPopulationConfigSchema = z.object({
  density: PopulationDensitySchema.default('normal'),
  tierDistribution: TierDistributionSchema.default({
    transient: 5,
    background: 3,
    minor: 1,
    major: 0,
  }),
  autoSeedOnCreate: z.boolean().default(true),
  autoPopulateOnMove: z.boolean().default(true),
  autoPromote: z.boolean().default(true),
});

/**
 * Map density presets to multiplier values used for batch counts.
 */
export const DENSITY_MULTIPLIERS: Record<z.infer<typeof PopulationDensitySchema>, number> = {
  sparse: 0.5,
  normal: 1,
  dense: 2,
};

/**
 * Schema for the NPC generation strategy.
 */
export const NpcGenerationStrategySchema = z.enum(['pool-only', 'pool-llm-refine', 'llm-author']);

/**
 * Schema for an NPC generation request.
 */
export const NpcGenerationRequestSchema = z.object({
  tier: NpcTierSchema,
  context: NpcGenerationContextSchema,
  seed: CharacterProfileSchema.partial().optional(),
  allowFallback: z.boolean().default(true),
});

/**
 * Schema for diversity constraints used during batch NPC generation.
 */
export const BatchGenerationDiversitySchema = z
  .object({
    minUniqueRaces: z.number().int().min(0).optional(),
    minUniqueGenders: z.number().int().min(0).optional(),
    minUniqueOccupations: z.number().int().min(0).optional(),
    uniqueNames: z.boolean().optional(),
  })
  .optional();

/**
 * Schema for a batch NPC generation request.
 */
export const BatchGenerationRequestSchema = z.object({
  counts: z.record(NpcTierSchema, z.number().int().min(0)).refine(
    (obj) => Object.values(obj).some((value) => value > 0),
    { message: 'At least one tier must have a positive count' },
  ),
  context: NpcGenerationContextSchema,
  diversity: BatchGenerationDiversitySchema,
  allowFallback: z.boolean().default(true),
});

/**
 * Schema for an NPC profile expansion request.
 */
export const NpcExpansionRequestSchema = z.object({
  existingProfile: CharacterProfileSchema,
  targetTier: NpcTierSchema,
  interactionSummary: z.array(z.string()),
  expansionTask: ProfileExpansionTaskSchema.optional(),
});

/**
 * Schema for metadata describing how an NPC generation result was produced.
 */
export const NpcGenerationResultMetaSchema = z.object({
  requestedTier: NpcTierSchema,
  resolvedTier: NpcTierSchema,
  strategy: NpcGenerationStrategySchema,
  usedFallback: z.boolean(),
  generatedAt: z.string().datetime(),
});

/**
 * Schema for batch generation result metadata.
 */
export const BatchGenerationResultMetaSchema = z.object({
  requested: z.record(NpcTierSchema, z.number().int().min(0)),
  generated: z.record(NpcTierSchema, z.number().int().min(0)),
  llmFallbacks: z.number().int().min(0),
  generatedAt: z.string().datetime(),
});

/**
 * Schema for a generated NPC result.
 */
export const NpcGenerationResultSchema = z.object({
  profile: z.union([CharacterProfileSchema, TransientNpcProfileSchema]),
  meta: NpcGenerationResultMetaSchema,
});

/**
 * Schema for a batch NPC generation result.
 */
export const BatchGenerationResultSchema = z.object({
  npcs: z.array(z.union([CharacterProfileSchema, TransientNpcProfileSchema])),
  meta: BatchGenerationResultMetaSchema,
});

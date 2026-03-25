import { z } from 'zod';
import { CharacterProfileSchema } from '../character/characterProfile.js';
import { NpcTierSchema, TransientNpcProfileSchema } from '../npc-tier/schemas.js';

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
 * Schema for a generated NPC result.
 */
export const NpcGenerationResultSchema = z.object({
  profile: z.union([CharacterProfileSchema, TransientNpcProfileSchema]),
  meta: NpcGenerationResultMetaSchema,
});

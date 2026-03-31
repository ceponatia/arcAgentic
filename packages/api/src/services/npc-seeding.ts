import { createLogger } from '@arcagentic/logger';
import { generateNpcBatch, type NpcGenDeps } from '@arcagentic/generator';
import {
  DENSITY_MULTIPLIERS,
  NpcPopulationConfigSchema,
  type BatchGenerationRequest,
  type BatchGenerationResult,
  type NpcGenerationContext,
  type NpcPopulationConfig,
} from '@arcagentic/schemas';

const log = createLogger('api', 'npc-seeding');

type PopulationNpcTier = 'major' | 'minor' | 'background' | 'transient';

/**
 * Default population config for newly seeded sessions.
 */
export const DEFAULT_POPULATION_CONFIG: NpcPopulationConfig = NpcPopulationConfigSchema.parse({});

/**
 * Derive concrete tier counts from the configured density and distribution.
 */
export function deriveBatchCounts(
  config: NpcPopulationConfig,
): Record<PopulationNpcTier, number> {
  const multiplier = DENSITY_MULTIPLIERS[config.density];

  return {
    transient: Math.round(config.tierDistribution.transient * multiplier),
    background: Math.round(config.tierDistribution.background * multiplier),
    minor: Math.round(config.tierDistribution.minor * multiplier),
    major: Math.round(config.tierDistribution.major * multiplier),
  };
}

/**
 * Generate NPCs for session seeding. Persistence is handled by the caller.
 */
export async function generateSeedNpcs(
  context: NpcGenerationContext,
  config: NpcPopulationConfig = DEFAULT_POPULATION_CONFIG,
  deps?: NpcGenDeps,
): Promise<BatchGenerationResult> {
  const counts = deriveBatchCounts(config);

  const request: BatchGenerationRequest = {
    counts,
    context,
    diversity: { uniqueNames: true, minUniqueRaces: 2 },
    allowFallback: true,
  };

  log.info({ counts, density: config.density }, 'generating seed npcs');

  const result = await generateNpcBatch(request, deps);

  log.info(
    { generated: result.npcs.length, fallbacks: result.meta.llmFallbacks },
    'seed npc generation complete'
  );

  return result;
}

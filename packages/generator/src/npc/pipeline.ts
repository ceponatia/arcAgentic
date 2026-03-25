import { NpcGenerationRequestSchema } from '@arcagentic/schemas';
import type { NpcGenerationRequest, NpcGenerationResult } from '@arcagentic/schemas';
import { poolOnlyStrategy } from './strategies/index.js';
import type { NpcStrategyMap } from './types.js';

/**
 * Strategy map for NPC generation.
 * PH02 and PH03 will add background, minor, and major strategies.
 */
const strategyMap: NpcStrategyMap = {
  transient: poolOnlyStrategy,
};

/**
 * Generate an NPC using the tiered generation pipeline.
 *
 * Routes the request to the appropriate strategy based on tier.
 * Falls back to pool-only generation if the requested tier's strategy
 * is unavailable and `allowFallback` is true.
 *
 * @param request - The NPC generation request.
 * @returns The generated NPC profile and metadata.
 * @throws If the tier has no strategy and fallback is disabled.
 */
export async function generateNpc(
  request: NpcGenerationRequest,
): Promise<NpcGenerationResult> {
  const parsed = NpcGenerationRequestSchema.parse(request);
  const strategy = strategyMap[parsed.tier];

  if (strategy) {
    return strategy(parsed);
  }

  if (parsed.allowFallback !== false) {
    const fallbackRequest: NpcGenerationRequest = {
      ...parsed,
      tier: 'transient',
    };
    const result = await poolOnlyStrategy(fallbackRequest);

    return {
      ...result,
      meta: {
        ...result.meta,
        requestedTier: parsed.tier,
        resolvedTier: 'transient',
        usedFallback: true,
      },
    };
  }

  throw new Error(
    `No generation strategy available for tier "${parsed.tier}" and fallback is disabled.`
  );
}
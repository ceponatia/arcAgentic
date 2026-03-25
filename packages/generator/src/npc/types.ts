import type { NpcGenerationRequest, NpcGenerationResult } from '@arcagentic/schemas';

/**
 * A generation strategy function that produces an NPC from a request.
 */
export type NpcGenStrategy = (
  request: NpcGenerationRequest,
) => Promise<NpcGenerationResult>;

/**
 * Registry mapping NPC tiers to their generation strategies.
 */
export type NpcStrategyMap = Partial<Record<NpcGenerationRequest['tier'], NpcGenStrategy>>;
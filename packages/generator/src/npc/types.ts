import type { TieredCognitionRouter } from '@arcagentic/llm';
import type { NpcGenerationRequest, NpcGenerationResult } from '@arcagentic/schemas';

export interface NpcGenDeps {
  cognitionRouter?: TieredCognitionRouter;
}

/**
 * A generation strategy function that produces an NPC from a request.
 */
export type NpcGenStrategy = (
  request: NpcGenerationRequest,
  deps?: NpcGenDeps,
) => Promise<NpcGenerationResult>;

/**
 * Registry mapping NPC tiers to their generation strategies.
 */
export type NpcStrategyMap = Partial<Record<NpcGenerationRequest['tier'], NpcGenStrategy>>;
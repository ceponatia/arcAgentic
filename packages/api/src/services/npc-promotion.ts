import { createLogger } from '@arcagentic/logger';
import { expandNpcProfile, type NpcGenDeps } from '@arcagentic/generator';
import {
  CharacterProfileSchema,
  NpcExpansionRequestSchema,
  NpcGenerationResultSchema,
  checkPromotion,
  getNextTier,
  type CharacterProfile,
  type PlayerInterestScore,
} from '@arcagentic/schemas';

const log = createLogger('api', 'npc-promotion');

type PromotionNpcTier = 'major' | 'minor' | 'background' | 'transient';

export interface NpcPromotionResult {
  promoted: boolean;
  newProfile?: CharacterProfile;
  newTier?: PromotionNpcTier;
}

/**
 * Expand an NPC profile when the current interest score crosses a promotion threshold.
 */
export async function checkAndExpandNpc(
  npcId: string,
  currentTier: PromotionNpcTier,
  interest: PlayerInterestScore,
  currentProfile: CharacterProfile,
  interactionSummary: string[],
  deps?: NpcGenDeps,
): Promise<NpcPromotionResult> {
  const promotionCheck = checkPromotion(npcId, currentTier, interest);

  if (!promotionCheck.shouldPromote) {
    return { promoted: false };
  }

  const targetTier: PromotionNpcTier | null = getNextTier(currentTier);
  if (!targetTier) {
    return { promoted: false };
  }

  log.info(
    { npcId, fromTier: currentTier, toTier: targetTier },
    'npc promotion triggered'
  );

  try {
    const expansionRequest = NpcExpansionRequestSchema.parse({
      existingProfile: CharacterProfileSchema.parse(currentProfile),
      targetTier,
      interactionSummary,
    });

    const expansionResult = NpcGenerationResultSchema.parse(
      await expandNpcProfile(expansionRequest, deps)
    );
    const newProfile = CharacterProfileSchema.parse(expansionResult.profile);

    return {
      promoted: true,
      newProfile,
      newTier: targetTier,
    };
  } catch (error: unknown) {
    log.error(
      { err: error, npcId, fromTier: currentTier, toTier: targetTier },
      'npc promotion expansion failed'
    );
    return { promoted: false };
  }
}

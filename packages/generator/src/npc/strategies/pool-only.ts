import type { CharacterProfile, NpcGenerationRequest, NpcGenerationResult } from '@arcagentic/schemas';
import { generateCharacter } from '../../character/generate.js';
import { TRANSIENT_NPC_THEME } from '../themes/index.js';

/**
 * Pool-only generation strategy for transient NPCs.
 * Wraps the existing character generator with transient defaults.
 */
export function poolOnlyStrategy(request: NpcGenerationRequest): Promise<NpcGenerationResult> {
  const existing: Partial<CharacterProfile> = Object.fromEntries(
    Object.entries(request.seed ?? {}).filter(([, value]) => value !== undefined)
  );

  if (request.context.nameOverride) {
    existing.name = request.context.nameOverride;
  }

  const result = generateCharacter({
    theme: TRANSIENT_NPC_THEME,
    existing,
    mode: 'fill-empty',
  });

  result.character.tier = 'transient';

  const tags = [...(result.character.tags ?? [])];
  if (!tags.includes('transient')) {
    tags.push('transient');
  }
  if (!tags.includes('generated')) {
    tags.unshift('generated');
  }
  result.character.tags = tags;

  return Promise.resolve({
    profile: result.character,
    meta: {
      requestedTier: request.tier,
      resolvedTier: 'transient',
      strategy: 'pool-only',
      usedFallback: false,
      generatedAt: result.meta.generatedAt,
    },
  });
}
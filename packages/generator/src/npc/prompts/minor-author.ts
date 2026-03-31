import type { LLMMessage } from '@arcagentic/llm';
import { ALIGNMENTS, GENDERS, type CharacterProfile, type NpcGenerationContext } from '@arcagentic/schemas';
import { buildContextSummary, buildSeedIdentitySummary } from './shared.js';

type NpcSeedIdentity = Pick<CharacterProfile, 'name' | 'age' | 'gender' | 'race'>;

/**
 * Build the prompt used to author a minor-tier NPC from a seeded identity.
 */
export function buildMinorAuthorPrompt(
  seedIdentity: NpcSeedIdentity,
  context: NpcGenerationContext,
): LLMMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You author coherent minor-tier NPCs for a roleplaying game.',
        'Use the seeded identity as an anchor, but you may make small adjustments for coherence or variety.',
        'Return JSON only with keys: name, age, gender, race, summary, backstory, occupation, alignment, personality, physique, details.',
        `Gender, if provided, must be one of: ${GENDERS.join(', ')}.`,
        `Alignment, if provided, must be one of: ${ALIGNMENTS.join(', ')}.`,
        'Set personality to an array of 3 to 6 short traits.',
        'Set physique to an object with optional keys build, posture, and notableFeatures.',
        'Set details to an array of concise string facts. Return JSON only.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `World context:\n${buildContextSummary(context)}`,
        `Seed identity:\n${buildSeedIdentitySummary(seedIdentity)}`,
        'Write a distinctive but practical minor NPC who fits the scene and does not overlap with the existing cast. Return JSON only.',
      ].join('\n\n'),
    },
  ];
}

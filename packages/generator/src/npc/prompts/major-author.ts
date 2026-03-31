import type { LLMMessage } from '@arcagentic/llm';
import { ALIGNMENTS, GENDERS, type CharacterProfile, type NpcGenerationContext } from '@arcagentic/schemas';
import { buildContextSummary, buildSeedIdentitySummary } from './shared.js';

type NpcSeedIdentity = Pick<CharacterProfile, 'name' | 'age' | 'gender' | 'race'>;

/**
 * Build the narrative-authoring prompt for a major-tier NPC.
 */
export function buildMajorNarrativePrompt(
  seedIdentity: NpcSeedIdentity,
  context: NpcGenerationContext,
): LLMMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You author important, story-rich NPCs for a roleplaying game.',
        'Focus on narrative identity first: social role, history, motivation, and scene fit.',
        'Return JSON only with keys: name, summary, backstory, occupation, alignment, personality, details.',
        `Gender, if you reference it implicitly, should stay compatible with the seed. Valid alignments are: ${ALIGNMENTS.join(', ')}.`,
        `Seed gender values use: ${GENDERS.join(', ')}.`,
        'Set personality to an array of 4 to 8 concise traits and details to an array of concise factual strings.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `World context:\n${buildContextSummary(context)}`,
        `Seed identity:\n${buildSeedIdentitySummary(seedIdentity)}`,
        'Create a major NPC who feels memorable, grounded, and distinct from the existing cast. Return JSON only.',
      ].join('\n\n'),
    },
  ];
}

/**
 * Build the behavioral-authoring prompt for a major-tier NPC.
 */
export function buildMajorBehavioralPrompt(
  narrativeResult: unknown,
  context: NpcGenerationContext,
): LLMMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You convert a narrative NPC draft into structured behavioral and physical data for a roleplaying game.',
        'Return JSON only with keys: personalityMap and physique.',
        'If you are unsure about any constrained enum field, omit that subfield instead of inventing an invalid value.',
        'personalityMap may include: dimensions, facets, traits, emotionalBaseline, values, fears, attachment, social, speech, stress.',
        'Use numeric scores between 0 and 1 where appropriate.',
        'For social, use schema-style values like welcoming|neutral|guarded|hostile and fast|moderate|slow|very-slow.',
        'For attachment, use secure|anxious-preoccupied|dismissive-avoidant|fearful-avoidant.',
        'For stress.primary and stress.secondary, use fight|flight|freeze|fawn.',
        'physique must be a structured object with build and appearance sections compatible with the shared schema.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `World context:\n${buildContextSummary(context)}`,
        `Narrative draft to structure:\n${JSON.stringify(narrativeResult, null, 2)}`,
        'Infer the character\'s behavioral profile and structured physique from the narrative draft. Return JSON only.',
      ].join('\n\n'),
    },
  ];
}

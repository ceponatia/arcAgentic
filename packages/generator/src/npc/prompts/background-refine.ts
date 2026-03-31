import type { LLMMessage } from '@arcagentic/llm';
import type { CharacterProfile, NpcGenerationContext } from '@arcagentic/schemas';
import { buildContextSummary, buildDraftSummary } from './shared.js';

/**
 * Build the prompt used to refine a pool-generated background NPC.
 */
export function buildBackgroundRefinePrompt(
  draft: CharacterProfile,
  context: NpcGenerationContext,
): LLMMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You refine lightweight NPC drafts for a roleplaying game.',
        'Keep the character grounded in the provided setting and location.',
        'Stay distinct from existing NPCs and avoid duplicate names or occupations when possible.',
        'Return JSON only with this shape: {"name": string, "summary": string, "occupation"?: string}.',
        'The summary must stay concise and under 500 characters.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `World context:\n${buildContextSummary(context)}`,
        `Pool-generated draft:\n${buildDraftSummary(draft)}`,
        'Refine this draft into a believable background NPC. Preserve the core identity unless changing it clearly improves variety. Return JSON only.',
      ].join('\n\n'),
    },
  ];
}

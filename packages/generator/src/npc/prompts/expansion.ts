import type { LLMMessage } from '@arcagentic/llm';
import type { CharacterProfile } from '@arcagentic/schemas';

type ExpansionPromptTier = 'transient' | 'background' | 'minor' | 'major';

interface ExpansionPromptParams {
  existingProfile: CharacterProfile;
  existingData?: Record<string, unknown>;
  interactionSummary: string[];
  fromTier: ExpansionPromptTier;
  targetTier: ExpansionPromptTier;
  fieldsToGenerate: string[];
}

function formatJsonBlock(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function describeField(field: string): string {
  switch (field) {
    case 'name':
      return 'name: string. Only provide when the current name is blank or missing.';
    case 'appearanceSnippet':
      return 'appearanceSnippet: concise string describing their visible look or presence.';
    case 'personalityTraits':
      return 'personalityTraits: array of 3 to 6 short traits.';
    case 'backstory':
      return 'backstory: short paragraph that deepens existing history without contradiction.';
    case 'scheduleTemplate':
      return 'scheduleTemplate: string or array of short routine notes.';
    case 'speechPatterns':
      return 'speechPatterns: concise string or object describing speech habits and tone.';
    case 'personalityMap':
      return 'personalityMap: schema-compatible structured personality object.';
    case 'detailedBackstory':
      return 'detailedBackstory: fuller narrative backstory that expands earlier history.';
    case 'detailedSchedule':
      return 'detailedSchedule: string or array of detailed routine beats.';
    case 'relationships':
      return 'relationships: array of concise relationship notes or a structured object.';
    case 'goals':
      return 'goals: array of concise goals or a structured object.';
    case 'fears':
      return 'fears: array of concise fears or a structured object.';
    case 'values':
      return 'values: array of concise values or a structured object.';
    default:
      return `${field}: provide a JSON value appropriate for this field.`;
  }
}

/**
 * Build the prompt used to expand an existing NPC profile to a deeper tier.
 */
export function buildExpansionPrompt({
  existingProfile,
  existingData,
  interactionSummary,
  fromTier,
  targetTier,
  fieldsToGenerate,
}: ExpansionPromptParams): LLMMessage[] {
  const fieldInstructions = fieldsToGenerate.map((field) => `- ${describeField(field)}`).join('\n');
  const interactionLines = interactionSummary.length
    ? interactionSummary.map((entry) => `- ${entry}`).join('\n')
    : '- No interaction history provided.';

  return [
    {
      role: 'system',
      content: [
        'You expand existing NPC profiles for a roleplaying game.',
        'Build on established traits, relationships, and identity anchors.',
        'Do not contradict existing facts. Add depth rather than replacing what already works.',
        'Never replace name, race, or gender unless the current value is blank.',
        'Return JSON only and include only the requested fields.',
        `Field requirements:\n${fieldInstructions}`,
      ].join('\n\n'),
    },
    {
      role: 'user',
      content: [
        `This NPC was previously a ${fromTier} NPC and has been promoted to ${targetTier} based on player interest.`,
        `Existing profile:\n${formatJsonBlock(existingProfile)}`,
        existingData ? `Additional existing data:\n${formatJsonBlock(existingData)}` : undefined,
        `Player interaction history:\n${interactionLines}`,
        `Expand this profile to ${targetTier} depth. Build on what exists, do not contradict established traits, and add only the requested fields.`,
        `Return a JSON object with only these new or expanded fields:\n- ${fieldsToGenerate.join('\n- ')}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    },
  ];
}

import { Effect } from 'effect';
import type { LLMMessage } from '@arcagentic/llm';
import {
  type ComposeNarrationOptions,
  type NarrationConfig,
  type NarrationResult,
  type NarratorContext,
  type NpcIntent,
  DEFAULT_NARRATION_CONFIG,
} from './types.js';

/** Build the narrator system prompt. */
export function buildNarratorSystemPrompt(config: NarrationConfig): string {
  const lines: string[] = [
    'You are a skilled narrative writer composing prose for an interactive roleplaying game.',
    `Write in ${config.voice} perspective.`,
    'Combine the provided NPC actions and dialogue into a flowing, immersive passage.',
    'Use *italics* for action descriptions and inner thoughts.',
    'Use "quotes" for spoken dialogue.',
    'Maintain consistent tense and voice throughout.',
  ];

  if (config.includeAtmosphere) {
    lines.push('Weave in brief atmospheric and sensory details when they enhance the scene.');
  }

  if (config.tone) {
    lines.push(`The overall tone should be ${config.tone}.`);
  }

  lines.push(`Keep the passage under ${config.maxWords} words.`);
  lines.push('Do not add new actions, dialogue, or decisions that were not provided in the NPC intents.');
  lines.push("Do not narrate the player character's actions or inner thoughts.");

  return lines.join('\n');
}

/** Build the narrator user prompt with scene context and NPC intents. */
export function buildNarratorUserPrompt(
  intents: NpcIntent[],
  context: NarratorContext,
): string {
  const lines: string[] = [];

  lines.push(`Location: ${context.locationName}`);
  if (context.sceneDescription) {
    lines.push(`Scene: ${context.sceneDescription}`);
  }
  if (context.presentActors.length > 0) {
    lines.push(`Present: ${context.presentActors.join(', ')}`);
  }

  if (context.recentHistory.length > 0) {
    lines.push('');
    lines.push('Recent narrative:');
    for (const line of context.recentHistory.slice(-3)) {
      lines.push(`> ${line}`);
    }
  }

  if (context.playerMessage) {
    lines.push('');
    lines.push(`The player said: "${context.playerMessage}"`);
  }

  lines.push('');
  lines.push('NPC intents to narrate:');
  for (const intent of intents) {
    const parts: string[] = [`- ${intent.name}`];
    if (intent.dialogue) {
      parts.push(`says: "${intent.dialogue}"`);
    }
    if (intent.action) {
      parts.push(`does: ${intent.action}`);
    }
    if (intent.emotion) {
      parts.push(`feeling: ${intent.emotion}`);
    }
    if (intent.targetId) {
      parts.push(`(directed at ${intent.targetId})`);
    }
    lines.push(parts.join(' | '));
  }

  lines.push('');
  lines.push('Compose the above into a single narrative passage.');

  return lines.join('\n');
}

/** Compose structured NPC intents into a cohesive narrative passage. */
export async function composeNarration(
  options: ComposeNarrationOptions,
): Promise<NarrationResult> {
  const { llmProvider, intents, context } = options;
  const config: NarrationConfig = {
    ...DEFAULT_NARRATION_CONFIG,
    ...options.config,
  };

  if (intents.length === 0) {
    return { prose: '', sourceIntents: [] };
  }

  const messages: LLMMessage[] = [
    { role: 'system', content: buildNarratorSystemPrompt(config) },
    { role: 'user', content: buildNarratorUserPrompt(intents, context) },
  ];

  const result = await Effect.runPromise(llmProvider.chat(messages));
  const prose = result.content?.trim() ?? '';

  return {
    prose,
    sourceIntents: intents,
  };
}

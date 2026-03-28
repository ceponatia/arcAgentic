import { Effect } from 'effect';
import type { LLMMessage } from '@arcagentic/llm';
import { createLogger } from '@arcagentic/logger';
import type { NarratorContext } from '@arcagentic/schemas';
import {
  type ComposeNarrationOptions,
  type NarrationConfig,
  type NarrationResult,
  type NpcIntent,
  DEFAULT_NARRATION_CONFIG,
} from './types.js';

const NARRATOR_TIMEOUT_MS = 12_000;
const logger = createLogger('narrator');

/** Build the narrator system prompt. */
export function buildNarratorSystemPrompt(config: NarrationConfig): string {
  const lines: string[] = [
    'You are a skilled narrative writer composing prose for an interactive romantic roleplaying game.',
    `Write in ${config.voice} perspective.`,
    'Write like a scene from a novel, not a chat log or transcript.',
    'Combine the provided NPC actions and dialogue into a flowing, immersive passage.',
    'CRITICAL: Your output must ALWAYS be a descriptive prose passage of at least 40 words. NEVER return just a line of dialogue.',
    'Bare dialogue output is NEVER acceptable.',
    'Always describe the NPC\'s body language, expressions, posture, physical presence, and manner of speaking, even when only dialogue is provided.',
    'If the NPC intent is only dialogue, you MUST describe how the character delivers the line: their posture, expression, tone of voice, where their eyes go, and the atmosphere of the space around them.',
    'Add visual detail about how the character looks in the moment and how they carry themselves.',
    'For romantic or interpersonal scenes, emphasize subtle emotional cues, tension, and proximity awareness.',
    'Treat dialogue-only intents as an opportunity to flesh out the scene, not as a signal to produce minimal output.',
    'Even if an NPC intent contains only dialogue with no action or emotion, you MUST add descriptive prose around the dialogue showing body language, tone of voice, facial expressions, and scene atmosphere.',
    'Use *italics* for action descriptions and inner thoughts.',
    'Use "quotes" for spoken dialogue.',
    'Maintain consistent tense and voice throughout.',
    'You may add low-stakes descriptive staging and sensory detail that interprets the provided moment, but do not introduce new decisions, plot events, or materially new actions.',
  ];

  if (config.includeAtmosphere) {
    lines.push('Actively layer in sensory atmosphere such as sounds, lighting, texture, temperature, and environmental feel when they support the moment.');
  }

  if (config.tone) {
    lines.push(`The overall tone should be ${config.tone}.`);
  }

  lines.push(`Keep the passage under ${config.maxWords} words, but never drop below 40 words.`);
  lines.push('Do not add new actions, dialogue, or decisions that were not provided in the NPC intents or scene actions.');
  lines.push('When a scene description is provided, use it to ground the NPC\'s response in their environment and current activity.');
  lines.push('When scene actions are provided, weave them naturally into the narrative passage.');
  lines.push("Do not narrate the player character's actions or inner thoughts.");

  return lines.join('\n');
}

/** Build the narrator user prompt with scene context and NPC intents. */
export function buildNarratorUserPrompt(
  intents: NpcIntent[],
  context: NarratorContext,
): string {
  const lines: string[] = [];
  const playerLabel = context.playerName?.trim() ?? 'The player';

  lines.push(`Location: ${context.locationName}`);
  if (context.sceneDescription) {
    lines.push(`Current scene/situation: ${context.sceneDescription}`);
    lines.push('Ground the NPC\'s response in this scene context.');
  }
  if (context.presentActors.length > 0) {
    lines.push(`Present: ${context.presentActors.join(', ')}`);
  }
  if (context.playerName) {
    lines.push(`The player character is ${context.playerName}.`);
  }
  if (context.playerDescription) {
    lines.push(`Player description: ${context.playerDescription}`);
  }

  if (context.recentHistory.length > 0) {
    lines.push('');
    lines.push('Recent narrative:');
    for (const line of context.recentHistory.slice(-3)) {
      lines.push(`> ${line}`);
    }
  }

  if (context.sceneEvents && context.sceneEvents.length > 0) {
    lines.push('');
    lines.push('Scene actions this turn:');
    for (const event of context.sceneEvents) {
      lines.push(`- ${event}`);
    }
  }

  if (context.playerMessage) {
    lines.push('');
    lines.push(`${playerLabel} said: "${context.playerMessage}"`);
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
    if (intent.targetActorId) {
      parts.push(`(directed at ${intent.targetActorId})`);
    }
    lines.push(parts.join(' | '));
  }

  lines.push('');
  lines.push('Compose the above into a vivid, descriptive prose passage of at least 40 words. Describe body language, expressions, and atmosphere - do not just repeat the dialogue.');

  return lines.join('\n');
}

/** Compose NPC intents into deterministic prose without an LLM call. */
export function composeNarrationFallback(intents: NpcIntent[]): NarrationResult {
  if (intents.length === 0) {
    return { prose: '', sourceIntents: [], source: 'fallback' };
  }

  const parts: string[] = [];
  for (const intent of intents) {
    const segments: string[] = [];
    if (intent.action) {
      segments.push(`*${intent.name} ${intent.action}.*`);
    }
    if (intent.dialogue) {
      const speechTarget = intent.targetActorId ? ` to ${intent.targetActorId}` : '';
      if (intent.emotion) {
        const expressionLine = intent.action
          ? `*${intent.name}'s expression carries ${intent.emotion} through the moment.*`
          : `*${intent.name}'s expression shifts, ${intent.emotion} evident in every line.*`;
        segments.push(expressionLine);
      }
      segments.push(`"${intent.dialogue}" ${intent.name} says${speechTarget}.`);
    } else if (intent.emotion) {
      segments.push(`*${intent.name}'s expression and tone suggest ${intent.emotion}.*`);
    }
    if (segments.length === 0) {
      segments.push(`*${intent.name} is silent.*`);
    }
    parts.push(segments.join(' '));
  }

  return {
    prose: parts.join('\n\n'),
    sourceIntents: intents,
    source: 'fallback',
  };
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

  logger.debug(
    {
      intentCount: intents.length,
      config: {
        voice: config.voice,
        tone: config.tone,
        includeAtmosphere: config.includeAtmosphere,
        maxWords: config.maxWords,
      },
    },
    'composeNarration called',
  );

  if (intents.length === 0) {
    return { prose: '', sourceIntents: [], source: 'direct' };
  }

  const messages: LLMMessage[] = [
    { role: 'system', content: buildNarratorSystemPrompt(config) },
    { role: 'user', content: buildNarratorUserPrompt(intents, context) },
  ];

  try {
    const result = await Promise.race([
      Effect.runPromise(llmProvider.chat(messages)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Narrator LLM timeout')), NARRATOR_TIMEOUT_MS),
      ),
    ]);
    const prose = result.content?.trim() ?? '';

    if (!prose) {
      logger.warn(
        {
          intentCount: intents.length,
          locationName: context.locationName,
          reason: 'empty-llm-response',
        },
        'Falling back to deterministic narration',
      );
      return composeNarrationFallback(intents);
    }

    logger.debug(
      {
        intentCount: intents.length,
        locationName: context.locationName,
        proseLength: prose.length,
      },
      'Narration completed successfully',
    );

    return {
      prose,
      sourceIntents: intents,
      source: 'llm',
    };
  } catch (error) {
    logger.error(
      {
        error,
        intentCount: intents.length,
        locationName: context.locationName,
      },
      'Narration failed',
    );
    logger.warn(
      {
        intentCount: intents.length,
        locationName: context.locationName,
        reason: 'llm-error',
      },
      'Falling back to deterministic narration',
    );
    return composeNarrationFallback(intents);
  }
}

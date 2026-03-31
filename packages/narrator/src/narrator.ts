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

function getTrimmedText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed;
}

function getIntentPhysicalAction(intent: NpcIntent): string | undefined {
  return getTrimmedText(intent.physicalAction) ?? getTrimmedText(intent.action);
}

function getContinuationActivity(intent: NpcIntent): string | undefined {
  return getTrimmedText(intent.continuationActivity) ?? getIntentPhysicalAction(intent);
}

function pushIntentDetail(
  lines: string[],
  label: string,
  value: string | undefined,
  options?: { quote?: boolean },
): void {
  if (!value) {
    return;
  }

  const renderedValue = options?.quote ? `"${value}"` : value;
  lines.push(`  ${label}: ${renderedValue}`);
}

/** Build the narrator system prompt. */
export function buildNarratorSystemPrompt(config: NarrationConfig): string {
  const lines: string[] = [
    'You are a skilled narrative writer composing prose for an interactive romantic roleplaying game.',
    `Write in ${config.voice} perspective.`,
    'CARDINAL RULE: Every response must be descriptive prose. Never return bare dialogue, chat-log formatting, or screenplay notation. Write like a scene from a novel.',
    'Combine the provided NPC actions and dialogue into a flowing, immersive passage.',
    'Render each character with body language, expression, posture, physical presence, and manner of speaking, even when the structured intent only contains dialogue.',
    'Use emotional cues, subtle tension, and scene-aware physical staging to make close interpersonal moments feel embodied rather than abstract.',
    'Preserve concrete NPC-provided physical actions, observations, and sensory details when they are present instead of flattening them into generic connective prose.',
    'Use internal state as subtext that shapes delivery, implication, and tone; do not automatically expose it as blunt omniscient exposition.',
    'When multiple NPCs respond, combine their beats into a single cohesive passage without losing which actor said or did what.',
    'When an NPC intent is marked as a continuation, treat it as ambient scene detail only. Do not invent dialogue for that NPC.',
    'Use *italics* for action descriptions and inner thoughts.',
    'Use "quotes" for spoken dialogue.',
    'Maintain consistent tense and voice throughout.',
    'You may add low-stakes descriptive staging and sensory detail that interprets the provided moment, but do not introduce new decisions, plot events, or materially new actions.',
  ];

  if (config.sceneProximity === 'close' || config.sceneProximity === 'intimate') {
    lines.push('Physical closeness is central to this scene. Emphasize sensory detail - warmth, breath, touch, scent - and the emotional weight of proximity. Avoid clinical language; write with intimacy and presence.');
  }

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
  const dialogueIntents = intents.filter((intent) => !intent.isContinuation);
  const continuationIntents = intents.filter((intent) => intent.isContinuation);

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

  if (context.sceneProximity) {
    lines.push('');
    lines.push(`Scene proximity: ${context.sceneProximity}`);
  }

  if (context.playerMessage) {
    lines.push('');
    lines.push(`${playerLabel} said: "${context.playerMessage}"`);
  }

  if (context.characterSummaries && context.characterSummaries.length > 0) {
    lines.push('');
    lines.push('Character guides for this scene:');
    for (const characterSummary of context.characterSummaries) {
      const parts = [characterSummary.name];
      if (characterSummary.speechStyle) {
        parts.push(`speaks ${characterSummary.speechStyle}`);
      }
      if (characterSummary.emotionalBaseline) {
        parts.push(`emotional tone: ${characterSummary.emotionalBaseline}`);
      }
      if (characterSummary.physicalMannerisms) {
        parts.push(`manner: ${characterSummary.physicalMannerisms}`);
      }
      if (characterSummary.proximityToPlayer) {
        parts.push(`proximity: ${characterSummary.proximityToPlayer}`);
      }
      lines.push(`- ${parts.join('; ')}`);
    }
  }

  if (dialogueIntents.length > 0) {
    lines.push('');
    lines.push('NPC intents to narrate:');
    for (const intent of dialogueIntents) {
      lines.push(`- ${intent.name}`);
      pushIntentDetail(lines, 'speech', getTrimmedText(intent.dialogue), { quote: true });
      pushIntentDetail(lines, 'physical action', getIntentPhysicalAction(intent));
      pushIntentDetail(lines, 'observation', getTrimmedText(intent.observation));
      pushIntentDetail(lines, 'sensory detail', getTrimmedText(intent.sensoryDetail));
      pushIntentDetail(lines, 'emotion', getTrimmedText(intent.emotion));
      pushIntentDetail(lines, 'internal state', getTrimmedText(intent.internalState));
      pushIntentDetail(lines, 'target actor', getTrimmedText(intent.targetActorId));
    }
  }

  if (continuationIntents.length > 0) {
    lines.push('');
    lines.push('Ambient scene activity (NPCs continuing what they were doing):');
    for (const intent of continuationIntents) {
      lines.push(
        `- ${intent.name}: ${getContinuationActivity(intent) ?? 'continuing their activity'}`
      );
    }
    lines.push('Weave these into the scene description as brief ambient detail. Do not give them dialogue.');
  }

  lines.push('');
  lines.push('Compose the above into a vivid, descriptive prose passage of at least 40 words. Describe body language, expressions, and atmosphere - do not just repeat the dialogue. Render continuation intents only as brief ambient scene detail and do not make those NPCs answer the player unless dialogue was explicitly provided.');

  return lines.join('\n');
}

/** Compose NPC intents into deterministic prose without an LLM call. */
export function composeNarrationFallback(intents: NpcIntent[]): NarrationResult {
  if (intents.length === 0) {
    return { prose: '', sourceIntents: [], source: 'fallback' };
  }

  const dialogueIntents = intents.filter((intent) => !intent.isContinuation);
  const continuationIntents = intents.filter((intent) => intent.isContinuation);
  const parts: string[] = [];
  for (const intent of dialogueIntents) {
    const segments: string[] = [];
    const physicalAction = getIntentPhysicalAction(intent);
    const observation = getTrimmedText(intent.observation);
    const sensoryDetail = getTrimmedText(intent.sensoryDetail);
    const emotion = getTrimmedText(intent.emotion);
    const dialogue = getTrimmedText(intent.dialogue);
    const targetActorId = getTrimmedText(intent.targetActorId);

    if (physicalAction) {
      segments.push(`*Action - ${intent.name}: ${physicalAction}.*`);
    }
    if (observation) {
      segments.push(`*Observation - ${intent.name}: ${observation}.*`);
    }
    if (sensoryDetail) {
      segments.push(`*Sensory detail - ${intent.name}: ${sensoryDetail}.*`);
    }
    if (emotion) {
      segments.push(`*Emotion - ${intent.name}: ${emotion}.*`);
    }
    if (dialogue) {
      const speechTarget = targetActorId ? ` to ${targetActorId}` : '';
      segments.push(`"${dialogue}" ${intent.name} says${speechTarget}.`);
    }
    if (segments.length === 0) {
      segments.push(`*${intent.name} is silent.*`);
    }
    parts.push(segments.join(' '));
  }

  for (const intent of continuationIntents) {
    const continuationActivity = getContinuationActivity(intent) ?? 'their activity';
    parts.push(`*${intent.name} continues ${continuationActivity}.*`);
  }

  return {
    prose: parts.join('\n\n') || 'The world is quiet.',
    sourceIntents: intents,
    source: 'fallback',
  };
}

/** Compose structured NPC intents into a cohesive narrative passage. */
export async function composeNarration(
  options: ComposeNarrationOptions,
): Promise<NarrationResult> {
  const { llmProvider, intents, context } = options;
  const resolvedSceneProximity = options.config?.sceneProximity ?? context.sceneProximity;
  const config: NarrationConfig = {
    ...DEFAULT_NARRATION_CONFIG,
    ...options.config,
    ...(resolvedSceneProximity ? { sceneProximity: resolvedSceneProximity } : {}),
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

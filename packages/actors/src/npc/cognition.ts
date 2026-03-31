import { Effect } from 'effect';
import type { ChatOptions, LLMMessage, LLMProvider } from '@arcagentic/llm';
import type { CharacterProfile, WorldEvent } from '@arcagentic/schemas';
import type {
  ActionResult,
  CognitionContext,
  CognitionContextExtras,
  CognitionLLMOptions,
  CognitionLLMResult,
  EpisodicMemorySummary,
} from './types.js';
import { NPC_DECISION_TIMEOUT_MS } from './config.js';
import { buildNpcCognitionPrompt, buildSystemPrompt } from './prompts.js';
import { applyPersonalityModifiers } from './personality-modifiers.js';
import { getStringField } from './event-access.js';
import { validateSpeechStyle } from './speech-validation.js';
import { performance } from 'node:perf_hooks';

interface StructuredNpcResponse {
  dialogue?: string;
  physicalAction?: string;
  observation?: string;
  internalState?: string;
  sensoryDetail?: string;
  emotion?: string;
}

function normalizeStructuredField(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function hasStructuredContent(response: StructuredNpcResponse): boolean {
  return (
    response.dialogue !== undefined ||
    response.physicalAction !== undefined ||
    response.observation !== undefined ||
    response.internalState !== undefined ||
    response.sensoryDetail !== undefined ||
    response.emotion !== undefined
  );
}

function tryParseJson(jsonStr: string): StructuredNpcResponse | null {
  try {
    const parsed: unknown = JSON.parse(jsonStr);

    if (typeof parsed === 'object' && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      const response: StructuredNpcResponse = {};
      const dialogue = normalizeStructuredField(obj['dialogue']);
      const physicalAction =
        normalizeStructuredField(obj['physicalAction']) ??
        normalizeStructuredField(obj['action']);
      const observation = normalizeStructuredField(obj['observation']);
      const internalState = normalizeStructuredField(obj['internalState']);
      const sensoryDetail = normalizeStructuredField(obj['sensoryDetail']);
      const emotion = normalizeStructuredField(obj['emotion']);

      if (dialogue) {
        response.dialogue = dialogue;
      }

      if (physicalAction) {
        response.physicalAction = physicalAction;
      }

      if (observation) {
        response.observation = observation;
      }

      if (internalState) {
        response.internalState = internalState;
      }

      if (sensoryDetail) {
        response.sensoryDetail = sensoryDetail;
      }

      if (emotion) {
        response.emotion = emotion;
      }

      return hasStructuredContent(response) ? response : null;
    }
  } catch {
    // JSON parse failed. Caller handles fallback behavior.
  }

  return null;
}

/**
 * Parse structured JSON from the LLM response.
 * Falls back to treating the entire content as plain dialogue if parsing fails.
 */
function parseStructuredResponse(content: string): StructuredNpcResponse | null {
  const trimmed = content.trim();

  if (trimmed.toUpperCase() === 'NO_ACTION') {
    return null;
  }

  const normalized = trimmed
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");

  const stripped = normalized
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .replace(/^`\s*/, '')
    .replace(/\s*`$/, '')
    .trim();

  const directResult = tryParseJson(stripped);
  if (directResult) {
    return directResult;
  }

  const jsonStart = stripped.indexOf('{');
  const jsonEnd = stripped.lastIndexOf('}');
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    const extracted = stripped.slice(jsonStart, jsonEnd + 1);
    const extractedResult = tryParseJson(extracted);

    if (extractedResult) {
      return extractedResult;
    }
  }

  const dialogue = normalizeStructuredField(stripped);
  return dialogue ? { dialogue } : null;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((err: unknown) => {
        clearTimeout(timeout);
        const error = err instanceof Error ? err : new Error(String(err));
        reject(error);
      });
  });
}

/**
 * Cognition layer - decision-making for NPCs.
 *
 * This is a simplified version for Phase 3.
 * Phase 4 will integrate LLM providers for rich decision-making.
 */
export class CognitionLayer {
  private static consecutiveTimeouts = 0;
  private static circuitOpenUntil = 0;
  private static readonly MAX_CONSECUTIVE_TIMEOUTS = 3;
  private static readonly CIRCUIT_COOLDOWN_MS = 60_000;

  /**
   * Decide on an action based on perception (synchronous for Phase 3).
   */
  static decideSync(context: CognitionContext): ActionResult | null {
    const { perception, state } = context;

    // No relevant events - idle
    if (perception.relevantEvents.length === 0) {
      return null;
    }

    // Simple rule: If someone spoke, respond with a SPEAK_INTENT
    const speakEvents = perception.relevantEvents.filter((e) => e.type === 'SPOKE');
    if (speakEvents.length > 0) {
      const lastSpeak = speakEvents[speakEvents.length - 1];
      const speakerActorId = lastSpeak ? getStringField(lastSpeak, 'actorId') : undefined;

      if (speakerActorId && speakerActorId !== state.id) {
        // Rule-based fallback has no access to NPC profile or name.
        // Return null so the turn route handles the absence gracefully
        // instead of surfacing a debug placeholder.
        return null;
      }
    }

    // Default: No action
    return null;
  }

  /**
   * Decide on an action based on perception (async for Phase 4 LLM integration).
   *
   * For Phase 3, this just calls decideSync.
   * Phase 4 will replace this with LLM-based cognition.
   */
  static async decide(context: CognitionContext): Promise<ActionResult | null> {
    return await Promise.resolve(this.decideSync(context));
  }

  /**
   * LLM-backed decision making. Falls back to rule-based decideSync on error or empty response.
   */
  static async decideLLM(
    context: CognitionContext,
    profile: CharacterProfile,
    llmProvider: LLMProvider,
    contextExtras?: CognitionContextExtras,
    episodicMemories?: EpisodicMemorySummary[],
    llmOptions?: CognitionLLMOptions
  ): Promise<CognitionLLMResult> {
    if (context.perception.relevantEvents.length === 0) {
      return { type: 'action', result: null };
    }

    if (Date.now() < this.circuitOpenUntil) {
      return { type: 'action', result: null };
    }

    const start = performance.now();

    try {
      const modifiers = applyPersonalityModifiers(profile.personalityMap, context.perception);
      const prompt = buildNpcCognitionPrompt(
        context.perception,
        context.state,
        profile,
        modifiers,
        contextExtras,
        episodicMemories
      );
      const speechStyle = profile.personalityMap?.speech;
      const messages: LLMMessage[] = [
        { role: 'system', content: buildSystemPrompt(speechStyle) },
        { role: 'user', content: prompt },
      ];
      const chatOptions: ChatOptions = {};

      if (llmOptions?.tools && llmOptions.tools.length > 0 && llmProvider.supportsTools) {
        chatOptions.tools = llmOptions.tools;
        chatOptions.tool_choice = 'auto';
      }

      const result = await withTimeout(
        Effect.runPromise(llmProvider.chat(messages, chatOptions)),
        NPC_DECISION_TIMEOUT_MS,
        '[NPC Cognition] LLM decision'
      );

      this.consecutiveTimeouts = 0;
      this.circuitOpenUntil = 0;

      const elapsed = performance.now() - start;
      if (elapsed > NPC_DECISION_TIMEOUT_MS) {
        console.warn(
          `[NPC Cognition] Decision took ${elapsed.toFixed(0)}ms (>${NPC_DECISION_TIMEOUT_MS}ms threshold)`
        );
      }

      if (result.tool_calls && result.tool_calls.length > 0) {
        const assistantMessage: LLMMessage = {
          role: 'assistant',
          content: result.content,
          tool_calls: result.tool_calls,
        };

        return {
          type: 'tool_calls',
          calls: result.tool_calls,
          messages: [...messages, assistantMessage],
        };
      }

      const structured = parseStructuredResponse(result.content ?? '');
      if (!structured) {
        // LLM returned NO_ACTION or empty response - NPC chose not to react.
        return { type: 'action', result: null };
      }

      if (speechStyle && structured.dialogue) {
        const validation = validateSpeechStyle(structured.dialogue, speechStyle);
        if (!validation.passed) {
          for (const warning of validation.warnings) {
            console.debug(
              `[NPC Cognition] Speech style warning for ${context.state.npcId}: ${warning}`
            );
          }
        }
      }

      const intent: WorldEvent = {
        type: 'SPEAK_INTENT',
        content: structured.dialogue ?? '',
        ...(structured.physicalAction
          ? {
              physicalAction: structured.physicalAction,
              action: structured.physicalAction,
            }
          : {}),
        ...(structured.observation ? { observation: structured.observation } : {}),
        ...(structured.internalState ? { internalState: structured.internalState } : {}),
        ...(structured.sensoryDetail ? { sensoryDetail: structured.sensoryDetail } : {}),
        ...(structured.emotion ? { emotion: structured.emotion } : {}),
        actorId: context.state.id,
        sessionId: context.state.sessionId,
        timestamp: new Date(),
      };

      return {
        type: 'action',
        result: { intent, delayMs: 300 } satisfies ActionResult,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        this.consecutiveTimeouts += 1;

        if (this.consecutiveTimeouts >= this.MAX_CONSECUTIVE_TIMEOUTS) {
          this.circuitOpenUntil = Date.now() + this.CIRCUIT_COOLDOWN_MS;
          console.warn(
            `[NPC Cognition] Circuit breaker open after ${this.MAX_CONSECUTIVE_TIMEOUTS} consecutive timeouts; skipping LLM for ${this.CIRCUIT_COOLDOWN_MS / 1000}s`
          );
        }

        console.warn(
          `[NPC Cognition] Decision timed out (>${NPC_DECISION_TIMEOUT_MS}ms); falling back to rules`
        );

        try {
          const fallbackResult = this.decideSync(context);

          return { type: 'action', result: fallbackResult };
        } catch (fallbackError) {
          console.error(
            '[NPC Cognition] Rule-based fallback failed after LLM timeout; NPC will not respond this turn',
            fallbackError
          );
          return { type: 'action', result: null };
        }
      } else {
        this.consecutiveTimeouts = 0;
      }
      console.error('[NPC Cognition] LLM failed; NPC will not respond this turn', error);
      return { type: 'action', result: null };
    }
  }

  /**
   * Evaluate if the NPC should act immediately or wait.
   */
  static shouldAct(context: CognitionContext): boolean {
    // For now, always act if we have relevant events
    return context.perception.relevantEvents.length > 0;
  }

  /**
   * Generate a summary of the decision for logging.
   */
  static summarizeDecision(result: ActionResult | null): string {
    if (!result) {
      return 'No action needed';
    }

    return `Decided to ${result.intent.type}${result.delayMs ? ` (delay: ${result.delayMs}ms)` : ''}`;
  }
}

import { Effect } from 'effect';
import type { LLMMessage, LLMProvider } from '@arcagentic/llm';
import type { CharacterProfile, WorldEvent } from '@arcagentic/schemas';
import type { ActionResult, CognitionContext, CognitionContextExtras } from './types.js';
import { buildNpcCognitionPrompt, buildSystemPrompt } from './prompts.js';
import { applyPersonalityModifiers } from './personality-modifiers.js';
import { getStringField } from './event-access.js';
import { validateSpeechStyle } from './speech-validation.js';
import { performance } from 'node:perf_hooks';

const NPC_DECISION_TIMEOUT_MS = 8000;

interface StructuredNpcResponse {
  dialogue: string;
  action?: string;
  emotion?: string;
}

function normalizeStructuredField(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function tryParseJson(jsonStr: string): StructuredNpcResponse | null {
  try {
    const parsed: unknown = JSON.parse(jsonStr);

    if (typeof parsed === 'object' && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      const dialogue = obj['dialogue'];

      if (typeof dialogue === 'string') {
        const response: StructuredNpcResponse = {
          dialogue: dialogue.trim(),
        };
        const action = normalizeStructuredField(obj['action']);
        const emotion = normalizeStructuredField(obj['emotion']);

        if (action) {
          response.action = action;
        }

        if (emotion) {
          response.emotion = emotion;
        }

        return response;
      }
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
function parseStructuredResponse(content: string): StructuredNpcResponse {
  const trimmed = content.trim();

  if (trimmed.toUpperCase() === 'NO_ACTION') {
    return { dialogue: '' };
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

  return { dialogue: stripped };
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
    contextExtras?: CognitionContextExtras
  ): Promise<ActionResult | null> {
    if (context.perception.relevantEvents.length === 0) return null;

    if (Date.now() < this.circuitOpenUntil) {
      return null;
    }

    const start = performance.now();

    try {
      const modifiers = applyPersonalityModifiers(profile.personalityMap, context.perception);
      const prompt = buildNpcCognitionPrompt(
        context.perception,
        context.state,
        profile,
        modifiers,
        contextExtras
      );
      const speechStyle = profile.personalityMap?.speech;
      const messages: LLMMessage[] = [
        { role: 'system', content: buildSystemPrompt(speechStyle) },
        { role: 'user', content: prompt },
      ];

      const result = await withTimeout(
        Effect.runPromise(llmProvider.chat(messages)),
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

      const structured = parseStructuredResponse(result.content ?? '');
      if (!structured.dialogue && !structured.action) {
        // LLM returned NO_ACTION or empty response - NPC chose not to react.
        return null;
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
        content: structured.dialogue,
        ...(structured.action ? { action: structured.action } : {}),
        ...(structured.emotion ? { emotion: structured.emotion } : {}),
        actorId: context.state.id,
        sessionId: context.state.sessionId,
        timestamp: new Date(),
      };

      return { intent, delayMs: 300 } satisfies ActionResult;
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
      } else {
        this.consecutiveTimeouts = 0;
      }
      console.error('[NPC Cognition] LLM failed; NPC will not respond this turn', error);
      return null;
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

import { Effect } from 'effect';
import { createLogger } from '@arcagentic/logger';
import {
  OpenAIEmbeddingService,
  type ChatOptions,
  type LLMMessage,
  type LLMProvider,
} from '@arcagentic/llm';
import { PgRetrievalService, type RetrievalResult } from '@arcagentic/retrieval';
import { getEnvValue } from '../utils/env.js';

const log = createLogger('api', 'retrieval');

let retrievalService: PgRetrievalService | null = null;
let loggedMissingApiKey = false;

const sessionPromptContexts = new Map<string, string>();
const actorPromptContexts = new Map<string, string>();

function toActorContextKey(sessionId: string, actorId: string): string {
  return `${sessionId}:${actorId}`;
}

function getPromptContext(sessionId: string, actorId: string): string | null {
  return (
    actorPromptContexts.get(toActorContextKey(sessionId, actorId)) ??
    sessionPromptContexts.get(sessionId) ??
    null
  );
}

function buildRetrievalPromptMessage(retrievalContext: string): LLMMessage {
  return {
    role: 'system',
    content: [
      'Supplementary retrieved knowledge for the current turn is available below.',
      'Use it only when it helps answer naturally and remain consistent.',
      'Do not mention retrieval, knowledge nodes, or hidden context directly.',
      retrievalContext,
    ].join('\n\n'),
  };
}

function withRetrievalPromptContext(
  messages: LLMMessage[],
  sessionId: string,
  actorId: string
): LLMMessage[] {
  const retrievalContext = getPromptContext(sessionId, actorId);
  if (!retrievalContext) {
    return messages;
  }

  const retrievalMessage = buildRetrievalPromptMessage(retrievalContext);
  const firstNonSystemIndex = messages.findIndex((message) => message.role !== 'system');

  if (firstNonSystemIndex === -1) {
    return [...messages, retrievalMessage];
  }

  return [
    ...messages.slice(0, firstNonSystemIndex),
    retrievalMessage,
    ...messages.slice(firstNonSystemIndex),
  ];
}

/**
 * Lazy-initialise the retrieval service. Returns null when embeddings are unavailable.
 */
export function getRetrievalService(): PgRetrievalService | null {
  if (retrievalService) {
    return retrievalService;
  }

  const apiKey = getEnvValue('OPENAI_API_KEY');
  if (!apiKey) {
    if (!loggedMissingApiKey) {
      log.warn('OPENAI_API_KEY not set; retrieval disabled');
      loggedMissingApiKey = true;
    }
    return null;
  }

  const baseUrl = getEnvValue('OPENAI_BASE_URL');
  const embeddingService = new OpenAIEmbeddingService({
    apiKey,
    ...(baseUrl ? { baseURL: baseUrl } : {}),
  });

  retrievalService = new PgRetrievalService(embeddingService);
  return retrievalService;
}

/**
 * Query the retrieval service for relevant knowledge context.
 */
export async function fetchRetrievalContext(
  sessionId: string,
  queryText: string,
  options?: { maxNodes?: number; actorId?: string }
): Promise<RetrievalResult | null> {
  const service = getRetrievalService();
  if (!service) {
    return null;
  }

  try {
    const result = await service.retrieve({
      sessionId,
      queryText,
      maxNodes: options?.maxNodes ?? 5,
      ...(options?.actorId ? { characterInstanceId: options.actorId } : {}),
    });

    if (result.nodes.length > 0) {
      log.info(
        {
          sessionId,
          actorId: options?.actorId,
          nodesReturned: result.metadata.nodesReturned,
          queryTimeMs: result.metadata.queryTimeMs,
        },
        'retrieval context fetched'
      );
    }

    return result;
  } catch (error) {
    log.warn(
      { err: error, sessionId, actorId: options?.actorId },
      'retrieval context fetch failed; continuing without context'
    );
    return null;
  }
}

/**
 * Convert retrieved nodes into a prompt-friendly summary.
 */
export function summarizeRetrievalContext(result: RetrievalResult): string {
  return result.nodes
    .map(({ node }) => `- ${node.path}: ${node.content}`)
    .join('\n');
}

/**
 * Set retrieval prompt context for a session or a specific actor in that session.
 */
export function setRetrievalPromptContext(
  sessionId: string,
  retrievalContext: string,
  actorId?: string
): void {
  if (actorId) {
    actorPromptContexts.set(toActorContextKey(sessionId, actorId), retrievalContext);
    return;
  }

  sessionPromptContexts.set(sessionId, retrievalContext);
}

/**
 * Clear retrieval prompt context for a session or a specific actor in that session.
 */
export function clearRetrievalPromptContext(sessionId: string, actorId?: string): void {
  if (actorId) {
    actorPromptContexts.delete(toActorContextKey(sessionId, actorId));
    return;
  }

  sessionPromptContexts.delete(sessionId);

  for (const contextKey of actorPromptContexts.keys()) {
    if (contextKey.startsWith(`${sessionId}:`)) {
      actorPromptContexts.delete(contextKey);
    }
  }
}

/**
 * Wrap an LLM provider so API-managed retrieval context is injected into NPC prompts.
 */
export function createRetrievalAwareLlmProvider(
  baseProvider: LLMProvider,
  scope: { sessionId: string; actorId: string }
): LLMProvider {
  return {
    id: `${baseProvider.id}:retrieval:${scope.actorId}`,
    supportsTools: baseProvider.supportsTools,
    supportsFunctions: baseProvider.supportsFunctions,
    chat(messages: LLMMessage[], options?: ChatOptions) {
      return baseProvider.chat(
        withRetrievalPromptContext(messages, scope.sessionId, scope.actorId),
        options
      );
    },
    stream(messages: LLMMessage[], options?: ChatOptions) {
      return baseProvider.stream(
        withRetrievalPromptContext(messages, scope.sessionId, scope.actorId),
        options
      );
    },
  } satisfies LLMProvider;
}

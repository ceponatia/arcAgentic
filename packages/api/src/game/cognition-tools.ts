import {
  CognitionLayer,
  type ActionResult,
  type CognitionContext,
  type CognitionContextExtras,
  type EpisodicMemorySummary,
} from '@arcagentic/actors';
import * as LlmPackage from '@arcagentic/llm';
import type { ChatOptions, LLMMessage, LLMProvider, LLMResponse } from '@arcagentic/llm';
import { createLogger } from '@arcagentic/logger';
import { recallEpisodicMemories, type RetrievalEmbeddingService } from '@arcagentic/retrieval';
import type {
  CharacterProfile,
  ToolCall,
  ToolDefinition,
  ToolResult,
  WorldEvent,
} from '@arcagentic/schemas';
import { Effect } from 'effect';
import { createSessionToolHandler } from './tools/handlers.js';

const log = createLogger('api', 'cognition-tools');

const MAX_TOOL_ITERATIONS = 3;
const TOOL_ITERATION_TIMEOUT_MS = 10_000;

const SESSION_TOOL_NAMES = [
  'get_session_tags',
  'get_session_persona',
  'query_npc_list',
  'get_npc_transcript',
  'examine_object',
  'navigate_player',
  'use_item',
] as const;

interface StructuredNpcResponse {
  dialogue?: string;
  physicalAction?: string;
  observation?: string;
  internalState?: string;
  sensoryDetail?: string;
  emotion?: string;
}

type CognitionToolLoopResult =
  | { type: 'action'; result: ActionResult | null }
  | { type: 'tool_calls'; calls: ToolCall[]; messages: LLMMessage[] };

type DecideLlmWithTools = (
  context: CognitionContext,
  profile: CharacterProfile,
  llmProvider: LLMProvider,
  contextExtras?: CognitionContextExtras,
  episodicMemories?: EpisodicMemorySummary[],
  llmOptions?: { tools?: ToolDefinition[] },
) => Promise<CognitionToolLoopResult>;

export type ToolExecutor = (args: Record<string, unknown>) => Promise<ToolResult>;
export type ToolExecutorMap = Map<string, ToolExecutor>;

export interface BuildToolExecutorMapParams {
  ownerEmail: string;
  sessionId: string;
  embeddingService?: RetrievalEmbeddingService | null;
}

export interface ResolveNpcCognitionWithToolsParams {
  context: CognitionContext;
  profile: CharacterProfile;
  llmProvider: LLMProvider;
  contextExtras?: CognitionContextExtras;
  episodicMemories?: EpisodicMemorySummary[];
  toolExecutors: ToolExecutorMap;
}

const FALLBACK_COGNITION_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_sensory_detail',
      description:
        'Retrieve sensory information about a target. Use this when the player wants to smell, touch, taste, look at, or listen to something or someone.',
      parameters: {
        type: 'object',
        properties: {
          sense_type: {
            type: 'string',
            enum: ['smell', 'touch', 'taste', 'look', 'listen'],
            description: 'The type of sensory perception',
          },
          target: {
            type: 'string',
            description: 'What or who the player is sensing (character name or object)',
          },
          body_part: {
            type: 'string',
            description: 'Specific body part if targeting a character',
          },
        },
        required: ['sense_type', 'target'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_npc_memory',
      description:
        "Retrieve an NPC's memories and impressions of the player. Use when NPC behavior should reflect past interactions.",
      parameters: {
        type: 'object',
        properties: {
          npc_id: {
            type: 'string',
            description: 'The NPC whose memories to query',
          },
          memory_type: {
            type: 'string',
            enum: ['recent', 'significant', 'emotional', 'all'],
            description: 'Type of memories to retrieve',
          },
          topic: {
            type: 'string',
            description: 'Optional topic to filter memories',
          },
        },
        required: ['npc_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_relationship',
      description:
        "Update the relationship state between player and NPC. Use after significant interactions that would affect the NPC's opinion.",
      parameters: {
        type: 'object',
        properties: {
          npc_id: {
            type: 'string',
            description: 'The NPC whose relationship to update',
          },
          action_type: {
            type: 'string',
            description: 'Predefined action type',
          },
          delta: {
            type: 'number',
            description: 'Direct change amount for a specific dimension',
          },
          dimension: {
            type: 'string',
            enum: ['fondness', 'trust', 'respect', 'comfort', 'attraction', 'fear'],
            description: 'Which affinity dimension to modify directly',
          },
          reason: {
            type: 'string',
            description: 'Brief reason for the relationship change',
          },
          milestone_id: {
            type: 'string',
            description: 'Milestone to record for a significant event',
          },
        },
        required: ['npc_id'],
      },
    },
  },
];

function getAvailableCognitionTools(): ToolDefinition[] {
  const maybeGetCognitionTools = (LlmPackage as { getCognitionTools?: () => ToolDefinition[] })
    .getCognitionTools;

  return typeof maybeGetCognitionTools === 'function'
    ? maybeGetCognitionTools()
    : FALLBACK_COGNITION_TOOLS;
}

const decideLlmWithTools = (
  CognitionLayer as unknown as { decideLLM: DecideLlmWithTools }
).decideLLM.bind(CognitionLayer);

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
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const obj = parsed as Record<string, unknown>;
    const response: StructuredNpcResponse = {};
    const dialogue = normalizeStructuredField(obj['dialogue']);
    const physicalAction =
      normalizeStructuredField(obj['physicalAction']) ?? normalizeStructuredField(obj['action']);
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
  } catch {
    return null;
  }
}

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
      .catch((error: unknown) => {
        clearTimeout(timeout);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });
}

function parseToolArguments(toolCall: ToolCall): Record<string, unknown> {
  if (!toolCall.function.arguments) {
    return {};
  }

  const parsed: unknown = JSON.parse(toolCall.function.arguments);
  return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}

function stringifyToolResult(result: ToolResult): string {
  try {
    return JSON.stringify(result);
  } catch (error) {
    log.warn({ err: error }, 'failed to stringify tool result');
    return JSON.stringify({
      success: false,
      error: 'Failed to serialize tool result.',
    } satisfies ToolResult);
  }
}

function parseToolLoopFinalResponse(content: string, context: CognitionContext): ActionResult | null {
  const structured = parseStructuredResponse(content);
  if (!structured) {
    return null;
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
    intent,
    delayMs: 300,
  } satisfies ActionResult;
}

async function resolveToolCalls(
  calls: ToolCall[],
  toolExecutors: ToolExecutorMap,
): Promise<LLMMessage[]> {
  const toolMessages: LLMMessage[] = [];

  for (const call of calls) {
    let result: ToolResult;

    try {
      const args = parseToolArguments(call);
      const executor = toolExecutors.get(call.function.name);

      if (!executor) {
        result = {
          success: false,
          error: `No executor registered for tool ${call.function.name}.`,
        };
      } else {
        result = await executor(args);
      }
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    toolMessages.push({
      role: 'tool',
      tool_call_id: call.id,
      name: call.function.name,
      content: stringifyToolResult(result),
    });
  }

  return toolMessages;
}

function executeGetSensoryDetail(args: Record<string, unknown>): ToolResult {
  const senseType = typeof args['sense_type'] === 'string' ? args['sense_type'].trim() : '';
  const target = typeof args['target'] === 'string' ? args['target'].trim() : '';
  const bodyPart = typeof args['body_part'] === 'string' ? args['body_part'].trim() : '';

  if (!senseType || !target) {
    return {
      success: false,
      error: 'sense_type and target are required.',
    };
  }

  const subject = bodyPart ? `${target}'s ${bodyPart}` : target;

  return {
    success: true,
    sense_type: senseType,
    target,
    ...(bodyPart ? { body_part: bodyPart } : {}),
    description: `You focus on ${subject} and gather a clearer ${senseType}-based impression, though the sensory query service is still using a fallback description in this phase.`,
    hint: 'Use this detail sparingly and keep it grounded in the current scene.',
  };
}

async function executeGetNpcMemory(
  args: Record<string, unknown>,
  params: BuildToolExecutorMapParams,
): Promise<ToolResult> {
  const npcId = typeof args['npc_id'] === 'string' ? args['npc_id'].trim() : '';
  if (!npcId) {
    return {
      success: false,
      error: 'npc_id is required.',
    };
  }

  if (!params.embeddingService) {
    return {
      success: false,
      error: 'NPC memory retrieval is unavailable for this session.',
    };
  }

  const topic = typeof args['topic'] === 'string' ? args['topic'].trim() : '';
  const memoryType = typeof args['memory_type'] === 'string' ? args['memory_type'].trim() : 'recent';
  const queryText = topic.length > 0 ? `${memoryType} ${topic}` : `${memoryType} interactions with the player`;

  const memories = await recallEpisodicMemories(
    {
      sessionId: params.sessionId,
      actorId: npcId,
      queryText,
      maxNodes: 5,
      minScore: 0.25,
    },
    params.embeddingService,
  );

  return {
    success: true,
    npc_id: npcId,
    memory_type: memoryType,
    count: memories.length,
    memories: memories.map((memory) => ({
      node_id: memory.nodeId,
      content: memory.content,
      ...(memory.learnedAt ? { learned_at: memory.learnedAt.toISOString() } : {}),
      ...(typeof memory.importance === 'number' ? { importance: memory.importance } : {}),
    })),
  };
}

function executeUpdateRelationship(args: Record<string, unknown>): ToolResult {
  const npcId = typeof args['npc_id'] === 'string' ? args['npc_id'].trim() : '';
  if (!npcId) {
    return {
      success: false,
      error: 'npc_id is required.',
    };
  }

  return {
    success: true,
    npc_id: npcId,
    applied: false,
    ...(typeof args['action_type'] === 'string' ? { action_type: args['action_type'] } : {}),
    ...(typeof args['dimension'] === 'string' ? { dimension: args['dimension'] } : {}),
    ...(typeof args['delta'] === 'number' ? { delta: args['delta'] } : {}),
    ...(typeof args['reason'] === 'string' ? { reason: args['reason'] } : {}),
    ...(typeof args['milestone_id'] === 'string' ? { milestone_id: args['milestone_id'] } : {}),
    hint: 'Relationship changes are acknowledged for this turn, but durable relationship persistence is not wired through a canonical event yet.',
  };
}

export function buildToolExecutorMap(params: BuildToolExecutorMapParams): ToolExecutorMap {
  const toolExecutors: ToolExecutorMap = new Map();
  const sessionToolHandler = createSessionToolHandler({
    ownerEmail: params.ownerEmail,
    sessionId: params.sessionId,
  });

  for (const toolName of SESSION_TOOL_NAMES) {
    toolExecutors.set(toolName, async (args) => {
      const result = await sessionToolHandler.execute({
        id: `session-tool:${toolName}`,
        type: 'function',
        function: {
          name: toolName,
          arguments: JSON.stringify(args),
        },
      });

      return result ?? {
        success: false,
        error: `No session tool handler registered for ${toolName}.`,
      };
    });
  }

  toolExecutors.set('get_sensory_detail', (args) => Promise.resolve(executeGetSensoryDetail(args)));
  toolExecutors.set('get_npc_memory', (args) => executeGetNpcMemory(args, params));
  toolExecutors.set('update_relationship', (args) => Promise.resolve(executeUpdateRelationship(args)));

  return toolExecutors;
}

export async function resolveNpcCognitionWithTools(
  params: ResolveNpcCognitionWithToolsParams,
): Promise<ActionResult | null> {
  const tools = getAvailableCognitionTools();

  let llmResult: CognitionToolLoopResult = await decideLlmWithTools(
    params.context,
    params.profile,
    params.llmProvider,
    params.contextExtras,
    params.episodicMemories,
    { tools },
  );

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
    if (llmResult.type === 'action') {
      return llmResult.result;
    }

    const toolMessages = await resolveToolCalls(llmResult.calls, params.toolExecutors);
    const continuationMessages: LLMMessage[] = [...llmResult.messages, ...toolMessages];
    const chatOptions: ChatOptions = {};

    if (params.llmProvider.supportsTools && tools.length > 0) {
      chatOptions.tools = tools;
      chatOptions.tool_choice = 'auto';
    }

    try {
      const reInvokeResult: LLMResponse = await withTimeout(
        Effect.runPromise(params.llmProvider.chat(continuationMessages, chatOptions)),
        TOOL_ITERATION_TIMEOUT_MS,
        `[Cognition Tools] Iteration ${iteration + 1}`,
      );

      if (reInvokeResult.tool_calls && reInvokeResult.tool_calls.length > 0) {
        llmResult = {
          type: 'tool_calls',
          calls: reInvokeResult.tool_calls,
          messages: [
            ...continuationMessages,
            {
              role: 'assistant',
              content: reInvokeResult.content,
              tool_calls: reInvokeResult.tool_calls,
            },
          ],
        };
        continue;
      }

      return parseToolLoopFinalResponse(reInvokeResult.content ?? '', params.context);
    } catch (error) {
      log.warn(
        {
          err: error,
          actorId: params.context.state.id,
          iteration: iteration + 1,
        },
        'npc cognition tool re-invocation failed',
      );
      return null;
    }
  }

  log.warn(
    {
      actorId: params.context.state.id,
      maxIterations: MAX_TOOL_ITERATIONS,
    },
    'npc cognition tool loop exhausted iterations without final action',
  );

  return null;
}
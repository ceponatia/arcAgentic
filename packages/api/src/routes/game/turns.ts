import type { Hono } from 'hono';
import { createLogger } from '@arcagentic/logger';
import { getOwnerEmail } from '../../auth/ownerEmail.js';
import { getSession } from '../../db/sessionsClient.js';
import { getEntityProfile, getRecentSpokeEvents, listActorStatesForSession } from '@arcagentic/db/node';
import { turnRateLimiter } from '../../middleware/rate-limiter.js';
import { notFound } from '../../utils/responses.js';
import { worldBus } from '@arcagentic/bus';
import { actorRegistry } from '@arcagentic/actors';
import {
  dialogueService,
  physicsService,
  tickEmitter,
  socialEngine,
  rulesEngine,
  Scheduler,
} from '@arcagentic/services';
import { isRecord, type CharacterProfile, type WorldEvent, type NpcNarrationIntent, type NarratorContext, type TurnNarrationMetadata } from '@arcagentic/schemas';
import { OpenAIProvider, createOpenRouterProviderFromEnv } from '@arcagentic/llm';
import { composeNarration, composeNarrationFallback } from '@arcagentic/narrator';
import { toSessionId } from '../../utils/uuid.js';
import { validateBody, validateParamId } from '../../utils/request-validation.js';
import { getEnvValue } from '../../utils/env.js';
import {
  clearRetrievalPromptContext,
  createRetrievalAwareLlmProvider,
  fetchRetrievalContext,
  setRetrievalPromptContext,
  summarizeRetrievalContext,
} from '../../services/retrieval-context.js';
import { z } from 'zod';

const log = createLogger('api', 'turns');

interface SessionRecord {
  id: string;
  settingId?: string | null;
}

type SpokeEvent = Extract<WorldEvent, { type: 'SPOKE' }>;
type ActorSpawnConfig = Parameters<typeof actorRegistry.spawn>[0];
type SpawnRelationships = ActorSpawnConfig extends { relationships?: infer Relationships }
  ? Relationships
  : never;

interface TurnResponseDto {
  message: string;
  speaker?: { actorId: string; name?: string };
  events: WorldEvent[];
  success: boolean;
  narration?: TurnNarrationMetadata;
}

const RESPONSE_TIMEOUT_MS = 10_000;

const TurnRequestSchema = z.object({
  input: z.string().trim().min(1),
  npcId: z.string().trim().min(1).optional(),
});

const openaiApiKey = getEnvValue('OPENAI_API_KEY') ?? '';
const openaiModel = getEnvValue('OPENAI_MODEL') ?? 'gpt-4o-mini';
const openaiBaseUrl = getEnvValue('OPENAI_BASE_URL');

const defaultTurnLlmProvider =
  createOpenRouterProviderFromEnv({ id: 'session-turns' }) ??
  (openaiApiKey
    ? new OpenAIProvider({
      id: 'session-turns-openai',
      apiKey: openaiApiKey,
      model: openaiModel,
      ...(openaiBaseUrl ? { baseURL: openaiBaseUrl } : {}),
    })
    : null);

/**
 * Parse a stored profile JSON blob into a CharacterProfile, if possible.
 */
function parseProfileJson(raw: unknown): CharacterProfile | null {
  if (!raw) return null;

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return isRecord(parsed) ? (parsed as CharacterProfile) : null;
    } catch (error) {
      log.warn({ err: error }, 'failed to parse npc profile json');
      return null;
    }
  }

  return isRecord(raw) ? (raw as CharacterProfile) : null;
}

/**
 * Resolve the NPC profile and display name from actor state + entity profile fallback.
 */
async function resolveNpcProfileAndName(
  actorState: Awaited<ReturnType<typeof listActorStatesForSession>>[number]
): Promise<{ profile: CharacterProfile | null; name: string | null }> {
  const rawState = isRecord(actorState.state) ? actorState.state : {};
  const stateName = typeof rawState['name'] === 'string' ? rawState['name'] : null;
  const stateLabel = typeof rawState['label'] === 'string' ? rawState['label'] : null;

  const profileFromState = parseProfileJson(rawState['profileJson'] ?? rawState['profile']);
  const profileName = profileFromState?.name ?? null;

  if (profileFromState || actorState.entityProfileId) {
    const entityProfile = actorState.entityProfileId
      ? await getEntityProfile(actorState.entityProfileId)
      : null;
    const fallbackProfile = parseProfileJson(entityProfile?.profileJson);
    const fallbackName = entityProfile?.name ?? null;

    return {
      profile: profileFromState ?? fallbackProfile ?? (fallbackName ? ({ name: fallbackName } as CharacterProfile) : null),
      name: stateName ?? profileName ?? fallbackName ?? stateLabel ?? null,
    };
  }

  return {
    profile: profileFromState,
    name: stateName ?? profileName ?? stateLabel ?? null,
  };
}

function resolveTurnLlmProvider(actorId: string, sessionId: string) {
  if (!defaultTurnLlmProvider) {
    return null;
  }

  return createRetrievalAwareLlmProvider(defaultTurnLlmProvider, { actorId, sessionId });
}

function extractRelationships(rawAffinity: unknown): SpawnRelationships | undefined {
  if (!isRecord(rawAffinity)) {
    return undefined;
  }

  const relationshipEntries = Object.entries(rawAffinity).flatMap<[string, NonNullable<SpawnRelationships>[string]]>(([targetActorId, rawRelationship]) => {
    if (!isRecord(rawRelationship)) {
      return [];
    }

    const relationshipType = rawRelationship['relationshipType'];
    const affinity = rawRelationship['affinity'];
    if (typeof relationshipType !== 'string' || !isRecord(affinity)) {
      return [];
    }

    const trust = affinity['trust'];
    const fondness = affinity['fondness'];
    const fear = affinity['fear'];
    if (
      typeof trust !== 'number' ||
      !Number.isFinite(trust) ||
      typeof fondness !== 'number' ||
      !Number.isFinite(fondness) ||
      typeof fear !== 'number' ||
      !Number.isFinite(fear)
    ) {
      return [];
    }

    return [[
      targetActorId,
      {
        relationshipType,
        affinity: {
          trust,
          fondness,
          fear,
        },
      },
    ]];
  });

  return relationshipEntries.length > 0
    ? Object.fromEntries(relationshipEntries) as SpawnRelationships
    : undefined;
}

export function registerTurnRoutes(app: Hono): void {
  /**
   * POST /sessions/:id/turns
   *
   * Execute a turn using the World Bus + Actors pipeline.
   */
  app.post('/sessions/:id/turns', turnRateLimiter, async (c) => {
    const sessionIdResult = validateParamId(c, 'id');
    if (!sessionIdResult.success) return sessionIdResult.errorResponse;

    const sessionId = sessionIdResult.data;
    const sessionKey = toSessionId(sessionId);
    const ownerEmail = getOwnerEmail(c);

    const session = (await getSession(sessionKey, ownerEmail)) as SessionRecord | null;
    if (!session) {
      return notFound(c, 'session not found');
    }

    const turnBodyResult = await validateBody(c, TurnRequestSchema);
    if (!turnBodyResult.success) return turnBodyResult.errorResponse;

    const input = turnBodyResult.data.input;
    const targetNpcId = turnBodyResult.data.npcId ?? null;

    // Ensure core services are running (idempotent starts)
    dialogueService.start();
    physicsService.start();
    tickEmitter.start();
    socialEngine.start();
    rulesEngine.start();
    Scheduler.start();

    // Spawn NPC actors for this session if missing.
    // NOTE: Projections only learn about NPCs via ACTOR_SPAWN events, so on a fresh
    // session we must seed actors from the authoritative actor_states table.
    const actorStates = await listActorStatesForSession(sessionKey);
    const playerActorState = actorStates.find((state) => state.actorType === 'player');
    const playerState = isRecord(playerActorState?.state) ? playerActorState.state : {};
    const playerProfile = parseProfileJson(playerState['profile']);
    const playerName = playerProfile?.name ?? undefined;
    const playerDescription = playerProfile?.summary ?? undefined;

    let startingScenario: string | undefined;
    if (session.settingId) {
      try {
        const settingEntityProfile = await getEntityProfile(session.settingId);
        const settingProfile = parseProfileJson(settingEntityProfile?.profileJson);
        const startingScenarioValue = isRecord(settingProfile)
          ? (settingProfile as { startingScenario?: unknown }).startingScenario
          : undefined;
        if (typeof startingScenarioValue === 'string') {
          startingScenario = startingScenarioValue;
        }
      } catch (error) {
        log.warn(
          { err: error, sessionId, settingId: session.settingId },
          'failed to load setting starting scenario for turn context'
        );
      }
    }

    const npcDisplayNames = new Map<string, string>();
    let resolvedLocationName = 'the current location';
    for (const actorState of actorStates) {
      if (actorState.actorType !== 'npc') continue;
      const actorId = actorState.actorId;

      const rawState = isRecord(actorState.state) ? actorState.state : {};
      const location = rawState['location'];
      if (resolvedLocationName === 'the current location' && isRecord(location)) {
        const locationName = location['name'];
        const currentLocationId = location['currentLocationId'];
        if (typeof locationName === 'string' && locationName !== 'unknown') {
          resolvedLocationName = locationName;
        } else if (typeof currentLocationId === 'string' && currentLocationId !== 'unknown') {
          resolvedLocationName = currentLocationId;
        }
      }
      const locationId =
        location && typeof location === 'object'
          ? (((location as Record<string, unknown>)['currentLocationId'] as string | undefined) ??
            'unknown')
          : 'unknown';

      const { profile, name } = await resolveNpcProfileAndName(actorState);

      if (name) {
        npcDisplayNames.set(actorId, name);
      }

      if (actorRegistry.has(actorId)) continue;

      const llmProvider = resolveTurnLlmProvider(actorId, sessionKey);
      const relationships = extractRelationships(rawState['affinity']);

      actorRegistry.spawn({
        id: actorId,
        type: 'npc',
        npcId: actorId,
        sessionId: sessionKey,
        locationId,
        ...(profile ? { profile } : {}),
        ...(llmProvider ? { llmProvider } : {}),
        ...(relationships ? { relationships } : {}),
        ...(playerName ? { playerName } : {}),
        ...(playerDescription ? { playerDescription } : {}),
        ...(startingScenario ? { startingScenario } : {}),
      });
    }

    // Collect events emitted during this turn
    const collected: WorldEvent[] = [];
    const handler = (event: WorldEvent): void => {
      const eventSessionId = (event as { sessionId?: string }).sessionId;
      if (eventSessionId !== sessionKey) return;
      collected.push(event);
    };

    await worldBus.subscribe(handler);

    const playerActorId = `player:${ownerEmail}`;
    try {
      const playerSpoke: WorldEvent = {
        type: 'SPOKE',
        actorId: playerActorId,
        content: input,
        targetActorId: targetNpcId ?? undefined,
        sessionId: sessionKey,
        timestamp: new Date(),
      };

      const retrievalResult = await fetchRetrievalContext(
        sessionKey,
        input,
        targetNpcId ? { actorId: targetNpcId } : undefined
      );

      if (retrievalResult && retrievalResult.nodes.length > 0) {
        setRetrievalPromptContext(
          sessionKey,
          summarizeRetrievalContext(retrievalResult),
          targetNpcId ?? undefined
        );
      }

      await worldBus.emit(playerSpoke);

      // Wait briefly for NPC responses to propagate
      await new Promise((resolve) => setTimeout(resolve, RESPONSE_TIMEOUT_MS));
    } finally {
      clearRetrievalPromptContext(sessionKey, targetNpcId ?? undefined);

      try {
        worldBus.unsubscribe(handler);
      } catch (error) {
        log.warn({ err: error, sessionId }, 'failed to unsubscribe world bus handler');
      }
    }

    // Collect all NPC speech events for narrator composition
    const npcSpokeEvents = collected.filter(
      (evt): evt is SpokeEvent => evt.type === 'SPOKE' && evt.actorId !== playerActorId,
    );

    // Quiet turn — no NPC responded
    if (npcSpokeEvents.length === 0) {
      const response: TurnResponseDto = {
        message: 'The world is quiet.',
        events: collected,
        success: true,
      };
      return c.json(response, 200);
    }

    // Build structured narration intents from collected SPOKE events
    const narrationIntents: NpcNarrationIntent[] = npcSpokeEvents.map((evt) => ({
      actorId: evt.actorId,
      name: npcDisplayNames.get(evt.actorId) ?? evt.actorId,
      dialogue: evt.content,
      ...(evt.action != null ? { action: evt.action } : {}),
      ...(evt.emotion != null ? { emotion: evt.emotion } : {}),
      ...(evt.targetActorId != null ? { targetActorId: evt.targetActorId } : {}),
    }));

    // Fetch recent conversation history for narrator continuity (last 6 SPOKE events, reversed to ascending)
    let recentHistory: string[] = [];
    try {
      const recentRows = await getRecentSpokeEvents(sessionKey, 6);
      recentHistory = recentRows
        .reverse()
        .map((row) => {
          const payload = (row.payload ?? {}) as Record<string, unknown>;
          const content = typeof payload['content'] === 'string' ? payload['content'] : '';
          const actorId = row.actorId ?? 'unknown';
          const isPlayer = actorId.startsWith('player');
          const name = isPlayer ? 'Player' : (npcDisplayNames.get(actorId) ?? actorId);
          return `${name}: "${content}"`;
        })
        .filter((line) => line.length > 0);
    } catch (error) {
      log.warn({ err: error, sessionId }, 'failed to fetch recent history for narrator');
    }

    // Build scene events from non-speech current-turn events for richer narration
    const sceneEventTypes = new Set(['MOVED', 'ITEM_ACQUIRED', 'ITEM_DROPPED', 'NPC_ACTIVITY_CHANGED', 'OBJECT_EXAMINED']);
    const sceneEvents: string[] = collected
      .filter((evt) => sceneEventTypes.has(evt.type))
      .map((evt) => {
        const actorId = 'actorId' in evt ? String(evt.actorId) : 'unknown';
        const name = npcDisplayNames.get(actorId) ?? actorId;

        switch (evt.type) {
          case 'MOVED':
            return `${name} moved from ${evt.fromLocationId} to ${evt.toLocationId}`;
          case 'ITEM_ACQUIRED':
            return `${name} acquired ${evt.itemId}`;
          case 'ITEM_DROPPED':
            return `${name} dropped ${evt.itemId}`;
          case 'NPC_ACTIVITY_CHANGED':
            return `${name} began ${evt.newActivity}`;
          case 'OBJECT_EXAMINED':
            return `${name} examined ${evt.target}`;
          default:
            return '';
        }
      })
      .filter((line) => line.length > 0);

    // Assemble scene context for the narrator
    const narratorContext: NarratorContext = {
      locationName: resolvedLocationName,
      presentActors: [...npcDisplayNames.values()],
      recentHistory,
      playerMessage: input,
      ...(startingScenario ? { sceneDescription: startingScenario } : {}),
      ...(sceneEvents.length > 0 ? { sceneEvents } : {}),
      ...(playerName ? { playerName } : {}),
      ...(playerDescription ? { playerDescription } : {}),
    };

    let message: string;
    let narrationSource: 'llm' | 'fallback' | 'direct';

    // Always route through the narrator for formatting (quotes, italics)
    if (defaultTurnLlmProvider) {
      const result = await composeNarration({
        llmProvider: defaultTurnLlmProvider,
        intents: narrationIntents,
        context: narratorContext,
      });
      message = result.prose || composeNarrationFallback(narrationIntents).prose;
      narrationSource = result.source;
    } else {
      const result = composeNarrationFallback(narrationIntents);
      message = result.prose;
      narrationSource = 'fallback';
    }

    // Preserve speaker field when exactly one NPC contributed
    const singleSpeaker = npcSpokeEvents.length === 1 ? npcSpokeEvents[0] : undefined;
    const speakerName = singleSpeaker
      ? npcDisplayNames.get(singleSpeaker.actorId)
      : undefined;

    const response: TurnResponseDto = {
      message,
      events: collected,
      success: true,
      ...(singleSpeaker
        ? {
          speaker: {
            actorId: singleSpeaker.actorId,
            ...(speakerName ? { name: speakerName } : {}),
          },
        }
        : {}),
      narration: {
        source: narrationSource,
        contributingActorIds: narrationIntents.map((i) => i.actorId),
        intents: narrationIntents,
      },
    };

    return c.json(response, 200);
  });
}

import type { Hono } from 'hono';
import { createLogger } from '@arcagentic/logger';
import { getOwnerEmail } from '../../auth/ownerEmail.js';
import { getSession } from '../../db/sessionsClient.js';
import {
  and,
  asc,
  drizzle,
  eq,
  events,
  getEntityProfile,
  getRecentSpokeEvents,
  gte,
  inArray,
  insertNarratorMessage,
  listRecentNarratorMessages,
  listRecentNarratorMessagesByLocation,
  listActorStatesForSession,
} from '@arcagentic/db/node';
import { turnRateLimiter } from '../../middleware/rate-limiter.js';
import { notFound } from '../../utils/responses.js';
import { worldBus } from '@arcagentic/bus';
import {
  actorRegistry,
  NpcActor,
  type ActionResult,
  type CognitionContext,
  type CognitionContextExtras,
  type EpisodicMemorySummary,
  type NpcMemoryProvider,
} from '@arcagentic/actors';
import {
  dialogueService,
  physicsService,
  tickEmitter,
  socialEngine,
  rulesEngine,
  Scheduler,
} from '@arcagentic/services';
import {
  PersonaProfileSchema,
  isRecord,
  type CharacterProfile,
  type NpcCharacterSummary,
  type NpcLocationState,
  type NpcNarrationIntent,
  type NarratorContext,
  type TurnNarrationMetadata,
  type WorldEvent,
} from '@arcagentic/schemas';
import { OpenAIProvider, createOpenRouterProviderFromEnv } from '@arcagentic/llm';
import { composeNarration, composeNarrationFallback } from '@arcagentic/narrator';
import {
  computeEpisodicDecayRate,
  computeEpisodicImportance,
  recallEpisodicMemories,
  type EpisodicRecallQuery,
  type RetrievalEmbeddingService,
  writeEpisodicMemory,
} from '@arcagentic/retrieval';
import { toSessionId } from '../../utils/uuid.js';
import { validateBody, validateParamId } from '../../utils/request-validation.js';
import { getEnvValue } from '../../utils/env.js';
import {
  clearRetrievalPromptContext,
  createRetrievalAwareLlmProvider,
  fetchRetrievalContext,
  getRetrievalEmbeddingService,
  setRetrievalPromptContext,
  summarizeRetrievalContext,
} from '../../services/retrieval-context.js';
import { z } from 'zod';
import { asNpcState } from '../../types/actor-state.js';
import {
  buildToolExecutorMap,
  resolveNpcCognitionWithTools,
} from '../../game/cognition-tools.js';
import { classifyPlayerInput } from '../../game/classify-input.js';

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
type ActorStateRecord = Awaited<ReturnType<typeof listActorStatesForSession>>[number];

interface NpcActivityContext {
  type: string;
  description: string;
  engagement: string;
  target?: string;
}

interface ResolvedNpcStateRecord {
  actorState: ActorStateRecord;
  rawState: Record<string, unknown>;
  profile: CharacterProfile | null;
  name: string | null;
  locationId: string;
  locationState?: NpcLocationState;
}

interface NpcNarrationContextRecord {
  name: string;
  locationId: string;
  currentActivity?: NpcActivityContext;
}

interface LocationContext {
  locationName?: string;
  locationDescription?: string;
}

interface PersistedSpokeEventRow {
  id: string;
  sequence: bigint;
  actorId: string | null;
}

interface TurnResponseDto {
  message: string;
  speaker?: { actorId: string; name?: string };
  events: WorldEvent[];
  success: boolean;
  narration?: TurnNarrationMetadata;
}

interface DirectCognitionInput {
  context: CognitionContext;
  contextExtras: CognitionContextExtras;
  profile: CharacterProfile;
  llmProvider: NonNullable<ReturnType<typeof resolveTurnLlmProvider>>;
}

const RESPONSE_TIMEOUT_MS = parseInt(getEnvValue('TURN_RESPONSE_TIMEOUT_MS') ?? '25000', 10);

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

function parseJsonRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw) {
    return null;
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return isRecord(parsed) ? parsed : null;
    } catch (error) {
      log.warn({ err: error }, 'failed to parse profile json record');
      return null;
    }
  }

  return isRecord(raw) ? raw : null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return isRecord(error) && error['code'] === '23505';
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

function extractCurrentLocationId(state: unknown): string | undefined {
  if (!isRecord(state)) {
    return undefined;
  }

  const locationRecord = state['location'];
  if (isRecord(locationRecord)) {
    const currentLocationId = locationRecord['currentLocationId'];
    if (typeof currentLocationId === 'string' && currentLocationId !== 'unknown') {
      return currentLocationId;
    }
  }

  const locationId = state['locationId'];
  if (typeof locationId === 'string' && locationId !== 'unknown') {
    return locationId;
  }

  const npcLocationState = state['locationState'];
  if (isRecord(npcLocationState)) {
    const currentLocationId = npcLocationState['locationId'];
    if (typeof currentLocationId === 'string' && currentLocationId !== 'unknown') {
      return currentLocationId;
    }
  }

  const simulation = state['simulation'];
  if (isRecord(simulation)) {
    const currentState = simulation['currentState'];
    if (isRecord(currentState)) {
      const currentLocationId = currentState['locationId'];
      if (typeof currentLocationId === 'string' && currentLocationId !== 'unknown') {
        return currentLocationId;
      }
    }
  }

  const currentLocationId = state['currentLocationId'];
  if (typeof currentLocationId === 'string' && currentLocationId !== 'unknown') {
    return currentLocationId;
  }

  return undefined;
}

function extractNpcLocationState(actorState: ActorStateRecord): NpcLocationState | undefined {
  if (actorState.actorType !== 'npc') {
    return undefined;
  }

  const npcState = asNpcState(actorState.state);
  return npcState.simulation?.currentState ?? npcState.locationState;
}

function extractLocationContextFromState(rawState: Record<string, unknown>): LocationContext {
  const location = rawState['location'];
  if (!isRecord(location)) {
    return {};
  }

  const locationName =
    typeof location['name'] === 'string' && location['name'] !== 'unknown'
      ? location['name']
      : undefined;
  const locationDescription =
    typeof location['description'] === 'string'
      ? location['description']
      : typeof location['summary'] === 'string'
        ? location['summary']
        : undefined;

  return {
    ...(locationName ? { locationName } : {}),
    ...(locationDescription ? { locationDescription } : {}),
  };
}

function toCurrentActivity(locationState?: NpcLocationState): NpcActivityContext | undefined {
  if (!locationState?.activity?.description) {
    return undefined;
  }

  return {
    type: locationState.activity.type,
    description: locationState.activity.description,
    engagement: locationState.activity.engagement,
    ...(locationState.activity.target ? { target: locationState.activity.target } : {}),
  };
}

function normalizeProximityLevel(value: string | undefined): string | undefined {
  switch (value) {
    case 'distant':
    case 'near':
    case 'close':
    case 'intimate':
      return value;
    case 'far':
      return 'distant';
    case 'observing':
      return 'near';
    default:
      return undefined;
  }
}

function resolveStoredPlayerProximity(rawState: Record<string, unknown>): string | undefined {
  const directPlayerProximity = normalizeProximityLevel(
    typeof rawState['playerProximity'] === 'string' ? rawState['playerProximity'] : undefined
  );
  if (directPlayerProximity) {
    return directPlayerProximity;
  }

  const directProximity = normalizeProximityLevel(
    typeof rawState['proximity'] === 'string' ? rawState['proximity'] : undefined
  );
  if (directProximity) {
    return directProximity;
  }

  const proximity = rawState['proximity'];
  if (!isRecord(proximity)) {
    return undefined;
  }

  const interactionProximity = normalizeProximityLevel(
    typeof proximity['interaction'] === 'string' ? proximity['interaction'] : undefined
  );
  if (interactionProximity) {
    return interactionProximity;
  }

  const worldProximity = typeof proximity['world'] === 'string' ? proximity['world'] : undefined;
  if (worldProximity === 'same-location') {
    return 'near';
  }

  if (worldProximity) {
    return 'distant';
  }

  return undefined;
}

function resolvePlayerProximity(
  rawState: Record<string, unknown>,
  npcLocationId: string,
  playerLocationId?: string
): string {
  const storedProximity = resolveStoredPlayerProximity(rawState);
  if (storedProximity) {
    return storedProximity;
  }

  if (
    typeof playerLocationId === 'string' &&
    playerLocationId.length > 0 &&
    npcLocationId === playerLocationId
  ) {
    return 'near';
  }

  return 'distant';
}

function humanizeNarrationToken(value: string): string {
  return value.replaceAll('-', ' ');
}

function describeMoodStability(stability: number | undefined): string | undefined {
  if (typeof stability !== 'number' || !Number.isFinite(stability)) {
    return undefined;
  }

  if (stability >= 0.75) {
    return 'very steady';
  }

  if (stability >= 0.55) {
    return 'steady';
  }

  if (stability >= 0.35) {
    return 'changeable';
  }

  return 'volatile';
}

function toOptionalJoinedText(parts: string[]): string | undefined {
  return parts.length > 0 ? parts.join(', ') : undefined;
}

function getSceneProximityRank(proximity: string): number {
  switch (proximity) {
    case 'distant':
      return 0;
    case 'near':
      return 1;
    case 'close':
      return 2;
    case 'intimate':
      return 3;
    default:
      return -1;
  }
}

function buildNpcCharacterSummary(
  actorId: string,
  name: string,
  profile: CharacterProfile | undefined,
  proximityToPlayer?: string
): NpcCharacterSummary {
  const summary: NpcCharacterSummary = { actorId, name };
  const speech = profile?.personalityMap?.speech;

  if (speech) {
    const parts: string[] = [];

    if (speech.vocabulary) {
      parts.push(humanizeNarrationToken(speech.vocabulary));
    }

    if (speech.formality) {
      parts.push(humanizeNarrationToken(speech.formality));
    }

    if (speech.pace) {
      parts.push(`${humanizeNarrationToken(speech.pace)} pace`);
    }

    summary.speechStyle = toOptionalJoinedText(parts);
  }

  const emotionalBaseline = profile?.personalityMap?.emotionalBaseline;
  if (emotionalBaseline) {
    const parts: string[] = [];
    const mood = emotionalBaseline.moodBaseline ?? emotionalBaseline.current;
    const stability = describeMoodStability(emotionalBaseline.moodStability);

    if (mood) {
      parts.push(humanizeNarrationToken(mood));
    }

    if (stability) {
      parts.push(`${stability} emotional center`);
    }

    summary.emotionalBaseline = toOptionalJoinedText(parts);
  }

  const summaryText = profile?.summary?.trim();
  const physicalMannerismsSource =
    summaryText && summaryText.length > 0 ? summaryText : profile?.backstory?.trim();
  if (physicalMannerismsSource) {
    summary.physicalMannerisms = truncateText(physicalMannerismsSource, 100);
  }

  if (proximityToPlayer) {
    summary.proximityToPlayer = proximityToPlayer;
  }

  return summary;
}

function resolveSceneProximity(proximities: Iterable<string | undefined>): string | undefined {
  let closestProximity: string | undefined;

  for (const proximity of proximities) {
    const normalizedProximity = normalizeProximityLevel(proximity);
    if (!normalizedProximity) {
      continue;
    }

    if (
      !closestProximity ||
      getSceneProximityRank(normalizedProximity) > getSceneProximityRank(closestProximity)
    ) {
      closestProximity = normalizedProximity;
    }
  }

  return closestProximity;
}

function buildNearbyNpcSummaries(
  allNpcStates: ResolvedNpcStateRecord[],
  currentNpcId: string,
  currentLocationId: string
): string[] {
  if (!currentLocationId || currentLocationId === 'unknown') {
    return [];
  }

  return allNpcStates
    .filter(
      (state) =>
        state.actorState.actorId !== currentNpcId && state.locationId === currentLocationId
    )
    .map((state) => {
      const name = state.name ?? state.actorState.actorId;
      const activity = state.locationState?.activity?.description?.trim();
      return activity ? `${name}: ${activity}` : `${name}: standing around`;
    });
}

function buildNearbyActorIds(
  actorLocationIds: Map<string, string>,
  currentLocationId?: string
): string[] {
  if (!currentLocationId || currentLocationId === 'unknown') {
    return [];
  }

  return [...actorLocationIds.entries()]
    .filter(([, locationId]) => locationId === currentLocationId)
    .map(([actorId]) => actorId);
}

function resolveNarratorMessageLocationId(
  contributingActorIds: string[],
  npcLocationIds: Map<string, string>,
  playerLocationId?: string
): string | undefined {
  const uniqueLocationIds = [...new Set(
    contributingActorIds
      .map((actorId) => npcLocationIds.get(actorId))
      .filter((locationId): locationId is string =>
        typeof locationId === 'string' && locationId.length > 0 && locationId !== 'unknown'
      )
  )];

  if (uniqueLocationIds.length === 1) {
    return uniqueLocationIds[0];
  }

  return playerLocationId;
}

function createNpcMemoryProvider(
  embeddingService: RetrievalEmbeddingService
): NpcMemoryProvider {
  return {
    async getEpisodicMemories({ sessionId, actorId, recentContext }) {
      const query: EpisodicRecallQuery = {
        sessionId,
        actorId,
        queryText: recentContext,
        maxNodes: 5,
        minScore: 0.3,
      };

      try {
        return await recallEpisodicMemories(query, embeddingService);
      } catch (error) {
        log.warn(
          { err: error, sessionId, actorId },
          'failed to recall npc episodic memories; continuing without episodic context'
        );
        return [];
      }
    },
  };
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

function collectIntentValues(
  intents: NpcNarrationIntent[],
  selector: (intent: NpcNarrationIntent) => string | undefined,
): string[] {
  const values = intents
    .map(selector)
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return [...new Set(values)];
}

function joinClauses(clauses: string[]): string {
  if (clauses.length === 0) {
    return '';
  }

  if (clauses.length === 1) {
    return clauses[0] ?? '';
  }

  if (clauses.length === 2) {
    return `${clauses[0] ?? ''} and ${clauses[1] ?? ''}`;
  }

  const initialClauses = clauses.slice(0, -1).join(', ');
  const finalClause = clauses[clauses.length - 1] ?? '';
  return `${initialClauses}, and ${finalClause}`;
}

function normalizeNarrationSnippet(value: string): string {
  return value.trim().replace(/\s+/g, ' ').replace(/[.!?]+$/g, '');
}

function lowercaseFirstCharacter(value: string): string {
  if (value.length === 0) {
    return value;
  }

  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function buildDialogueClause(dialogues: string[]): string | null {
  if (dialogues.length === 0) {
    return null;
  }

  const sanitizedDialogues = dialogues
    .slice(0, 2)
    .map((dialogue) => normalizeNarrationSnippet(dialogue).replace(/^"+|"+$/g, ''))
    .filter((dialogue) => dialogue.length > 0);

  if (sanitizedDialogues.length === 0) {
    return null;
  }

  if (sanitizedDialogues.length === 1) {
    return `said "${sanitizedDialogues[0]}"`;
  }

  return `said "${sanitizedDialogues[0]}" and later "${sanitizedDialogues[1]}"`;
}

function buildPhysicalActionClause(actions: string[]): string | null {
  const action = actions[0];
  if (!action) {
    return null;
  }

  const normalizedAction = normalizeNarrationSnippet(action).replace(/^I\s+/i, '');
  return normalizedAction.length > 0 ? normalizedAction : null;
}

function buildObservationClause(observations: string[]): string | null {
  const observation = observations[0];
  if (!observation) {
    return null;
  }

  const normalizedObservation = normalizeNarrationSnippet(observation).replace(/^I\s+/i, '');
  if (normalizedObservation.length === 0) {
    return null;
  }

  if (/^(noticed|saw|watched|heard)\b/i.test(normalizedObservation)) {
    return normalizedObservation;
  }

  return `noticed ${lowercaseFirstCharacter(normalizedObservation)}`;
}

function buildSensoryDetailClause(sensoryDetails: string[]): string | null {
  const sensoryDetail = sensoryDetails[0];
  if (!sensoryDetail) {
    return null;
  }

  const normalizedSensoryDetail = normalizeNarrationSnippet(sensoryDetail).replace(/^I\s+/i, '');
  if (normalizedSensoryDetail.length === 0) {
    return null;
  }

  if (/^(felt|heard|saw|smelled|tasted|sensed)\b/i.test(normalizedSensoryDetail)) {
    return normalizedSensoryDetail;
  }

  return `sensed ${lowercaseFirstCharacter(normalizedSensoryDetail)}`;
}

function buildEmotionClause(emotions: string[]): string | null {
  const emotion = emotions[0];
  if (!emotion) {
    return null;
  }

  const normalizedEmotion = normalizeNarrationSnippet(emotion).replace(/^I\s+/i, '');
  if (normalizedEmotion.length === 0) {
    return null;
  }

  if (/^(felt|was)\b/i.test(normalizedEmotion)) {
    return normalizedEmotion;
  }

  return `felt ${lowercaseFirstCharacter(normalizedEmotion)}`;
}

function buildInternalStateClause(internalStates: string[]): string | null {
  const internalState = internalStates[0];
  if (!internalState) {
    return null;
  }

  const normalizedInternalState = normalizeNarrationSnippet(internalState);
  if (normalizedInternalState.length === 0) {
    return null;
  }

  const withoutLeadingI = normalizedInternalState.replace(/^I\s+/i, '');
  if (/^(thought|wondered|realized|knew|decided)\b/i.test(withoutLeadingI)) {
    return withoutLeadingI;
  }

  if (/^I\s+/i.test(normalizedInternalState)) {
    return `thought ${normalizedInternalState}`;
  }

  return `thought ${lowercaseFirstCharacter(normalizedInternalState)}`;
}

function buildEpisodicMemoryText(intents: NpcNarrationIntent[]): string {
  const primaryClauses = [
    buildDialogueClause(collectIntentValues(intents, (intent) => intent.dialogue)),
    buildPhysicalActionClause(collectIntentValues(intents, (intent) => intent.physicalAction ?? intent.action)),
    buildObservationClause(collectIntentValues(intents, (intent) => intent.observation)),
    buildSensoryDetailClause(collectIntentValues(intents, (intent) => intent.sensoryDetail)),
  ].filter((clause): clause is string => typeof clause === 'string' && clause.length > 0);

  const reflectiveClauses = [
    buildEmotionClause(collectIntentValues(intents, (intent) => intent.emotion)),
    buildInternalStateClause(collectIntentValues(intents, (intent) => intent.internalState)),
  ].filter((clause): clause is string => typeof clause === 'string' && clause.length > 0);

  const sentences: string[] = [];
  if (primaryClauses.length > 0) {
    sentences.push(`I ${joinClauses(primaryClauses)}.`);
  }

  if (reflectiveClauses.length > 0) {
    sentences.push(`I ${joinClauses(reflectiveClauses)}.`);
  }

  return sentences.length > 0 ? sentences.join(' ') : 'I took part in the turn.';
}

function buildEpisodicMemorySummary(memoryText: string): string {
  const firstSentence = memoryText.split(/(?<=[.!?])\s+/)[0] ?? memoryText;
  return truncateText(firstSentence.trim(), 120);
}

function toSpokeEventFromActionResult(actionResult: ActionResult | null): SpokeEvent | null {
  if (!actionResult) {
    return null;
  }

  const intent = actionResult.intent;
  if (intent.type === 'SPOKE') {
    return intent;
  }

  if (intent.type !== 'SPEAK_INTENT') {
    return null;
  }

  if (!intent.actorId || !intent.sessionId) {
    return null;
  }

  return {
    type: 'SPOKE',
    actorId: intent.actorId,
    content: intent.content,
    sessionId: intent.sessionId,
    timestamp: intent.timestamp,
    ...(intent.targetActorId ? { targetActorId: intent.targetActorId } : {}),
    ...(intent.action ? { action: intent.action } : {}),
    ...(intent.physicalAction ? { physicalAction: intent.physicalAction } : {}),
    ...(intent.observation ? { observation: intent.observation } : {}),
    ...(intent.internalState ? { internalState: intent.internalState } : {}),
    ...(intent.sensoryDetail ? { sensoryDetail: intent.sensoryDetail } : {}),
    ...(intent.emotion ? { emotion: intent.emotion } : {}),
  };
}

async function persistNarratorTurnMessage(params: {
  sessionId: string;
  prose: string;
  source: 'llm' | 'fallback' | 'direct';
  npcSpokeEvents: SpokeEvent[];
  turnStartedAt: Date;
  locationId?: string;
}): Promise<void> {
  const contributingActorIds = [...new Set(params.npcSpokeEvents.map((event) => event.actorId))];
  if (contributingActorIds.length === 0 || params.prose.trim().length === 0) {
    return;
  }

  try {
    const persistedSpokeEvents: PersistedSpokeEventRow[] = await drizzle
      .select({
        id: events.id,
        sequence: events.sequence,
        actorId: events.actorId,
      })
      .from(events)
      .where(
        and(
          eq(events.sessionId, params.sessionId),
          eq(events.type, 'SPOKE'),
          inArray(events.actorId, contributingActorIds),
          gte(events.timestamp, params.turnStartedAt),
        )
      )
      .orderBy(asc(events.sequence));

    if (persistedSpokeEvents.length === 0) {
      log.warn(
        {
          sessionId: params.sessionId,
          actorIds: contributingActorIds,
          turnStartedAt: params.turnStartedAt.toISOString(),
        },
        'no persisted spoke events found for narrator message'
      );
      return;
    }

    const turnSequence = persistedSpokeEvents[0]?.sequence;
    if (turnSequence == null) {
      return;
    }

    await insertNarratorMessage({
      sessionId: params.sessionId,
      turnSequence,
      prose: params.prose,
      source: params.source,
      ...(params.locationId ? { locationId: params.locationId } : {}),
      contributingActorIds: [...new Set(
        persistedSpokeEvents
          .map((row) => row.actorId)
          .filter((actorId): actorId is string => typeof actorId === 'string' && actorId.length > 0)
      )],
      spokeEventIds: persistedSpokeEvents.map((row) => row.id),
    });
  } catch (error) {
    log.warn(
      {
        err: error,
        sessionId: params.sessionId,
        actorIds: contributingActorIds,
      },
      'failed to persist narrator message'
    );
  }
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
    const playerPersonaParseResult = PersonaProfileSchema.safeParse(
      playerProfile ?? playerState['profile']
    );
    const playerName = playerProfile?.name ?? undefined;
    const playerDescription = playerProfile?.summary ?? undefined;
    const playerLocationId = extractCurrentLocationId(playerState);
    const playerAppealTags = playerPersonaParseResult.success
      ? (playerPersonaParseResult.data.appealTags ?? [])
      : [];

    let startingScenario: string | undefined;
    if (session.settingId) {
      try {
        const settingEntityProfile = await getEntityProfile(session.settingId);
        const settingProfile = parseProfileJson(settingEntityProfile?.profileJson);
        const startingScenarioValue = isRecord(settingProfile)
          ? (settingProfile as { startingScenario?: unknown }).startingScenario
          : undefined;
        if (typeof startingScenarioValue === 'string') {
          const trimmedStartingScenario = startingScenarioValue.trim();
          if (trimmedStartingScenario.length > 0) {
            startingScenario = trimmedStartingScenario;
          }
        }
      } catch (error) {
        log.warn(
          { err: error, sessionId, settingId: session.settingId },
          'failed to load setting starting scenario for turn context'
        );
      }
    }

    try {
      const existingNarratorMessages = await listRecentNarratorMessages(sessionKey, 1);
      const isFirstTurn = existingNarratorMessages.length === 0;
      const seedLocationId =
        playerLocationId && playerLocationId !== 'unknown' ? playerLocationId : undefined;

      if (isFirstTurn && startingScenario) {
        try {
          await insertNarratorMessage({
            sessionId: sessionKey,
            turnSequence: 0n,
            prose: startingScenario,
            source: 'direct',
            contributingActorIds: [],
            spokeEventIds: [],
            ...(seedLocationId ? { locationId: seedLocationId } : {}),
          });
        } catch (error) {
          if (!isUniqueConstraintError(error)) {
            log.warn(
              { err: error, sessionId },
              'failed to seed starting scenario narrator message'
            );
          }
        }
      }
    } catch (error) {
      log.warn(
        { err: error, sessionId },
        'failed to determine whether starting scenario should be seeded'
      );
    }

    const npcDisplayNames = new Map<string, string>();
    const actorLocationIds = new Map<string, string>();
    const npcLocationIds = new Map<string, string>();
    const npcProfiles = new Map<string, CharacterProfile>();
    const npcProximityMap = new Map<string, string>();
    const npcNarrationContexts = new Map<string, NpcNarrationContextRecord>();
    let resolvedLocationName = 'the current location';
    let retrievalEmbeddingService: RetrievalEmbeddingService | null = null;

    try {
      retrievalEmbeddingService = getRetrievalEmbeddingService();
    } catch (error) {
      log.warn(
        { err: error, sessionId },
        'failed to initialize retrieval embedding service for npc memory provider'
      );
    }

    let npcMemoryProvider: NpcMemoryProvider | undefined;
    if (retrievalEmbeddingService) {
      try {
        npcMemoryProvider = createNpcMemoryProvider(retrievalEmbeddingService);
      } catch (error) {
        log.warn(
          { err: error, sessionId },
          'failed to initialize npc memory provider; continuing without episodic recall'
        );
      }
    }

    const narratorHistoryCache = new Map<string, Promise<string[]>>();
    const locationContextCache = new Map<string, Promise<LocationContext>>();
    const npcDirectCognitionInputs = new Map<string, DirectCognitionInput>();
    const loadNarratorHistory = (locationId?: string): Promise<string[]> => {
      const key = locationId ? `location:${locationId}` : 'session';
      const cached = narratorHistoryCache.get(key);
      if (cached) {
        return cached;
      }

      const pending = (async () => {
        try {
          const rows = locationId
            ? await listRecentNarratorMessagesByLocation(sessionKey, locationId, 5)
            : await listRecentNarratorMessages(sessionKey, 5);

          return rows
            .map((row: { prose: string }) => row.prose.trim())
            .filter((prose: string) => prose.length > 0);
        } catch (error) {
          log.warn(
            { err: error, sessionId, locationId },
            'failed to load narrator history for npc context'
          );
          return [];
        }
      })();

      narratorHistoryCache.set(key, pending);
      return pending;
    };

    const loadLocationContext = (locationId?: string): Promise<LocationContext> => {
      if (!locationId || locationId === 'unknown') {
        return Promise.resolve({});
      }

      const cached = locationContextCache.get(locationId);
      if (cached) {
        return cached;
      }

      const pending = (async () => {
        try {
          const entityProfile = await getEntityProfile(locationId);
          const parsedProfile = parseJsonRecord(entityProfile?.profileJson);
          const profileName = parsedProfile?.['name'];
          const summary = parsedProfile?.['summary'];
          const description = parsedProfile?.['description'];

          return {
            ...(typeof entityProfile?.name === 'string' && entityProfile.name.length > 0
              ? { locationName: entityProfile.name }
              : typeof profileName === 'string' && profileName.length > 0
                ? { locationName: profileName }
                : {}),
            ...(typeof description === 'string' && description.length > 0
              ? { locationDescription: description }
              : typeof summary === 'string' && summary.length > 0
                ? { locationDescription: summary }
                : {}),
          };
        } catch (error) {
          log.warn({ err: error, locationId, sessionId }, 'failed to load location context');
          return {};
        }
      })();

      locationContextCache.set(locationId, pending);
      return pending;
    };

    const npcStateRecords = await Promise.all(
      actorStates
        .filter((state) => state.actorType === 'npc')
        .map(async (actorState): Promise<ResolvedNpcStateRecord> => {
          const rawState = isRecord(actorState.state) ? actorState.state : {};
          const locationState = extractNpcLocationState(actorState);
          const locationId = locationState?.locationId ?? extractCurrentLocationId(rawState) ?? 'unknown';
          const { profile, name } = await resolveNpcProfileAndName(actorState);

          return {
            actorState,
            rawState,
            profile,
            name,
            locationId,
            ...(locationState ? { locationState } : {}),
          };
        })
    );

    npcStateRecords.forEach((record) => {
      const actorId = record.actorState.actorId;
      const name = record.name ?? actorId;
      const currentActivity = toCurrentActivity(record.locationState);

      npcNarrationContexts.set(actorId, {
        name,
        locationId: record.locationId,
        ...(currentActivity ? { currentActivity } : {}),
      });

      if (record.name) {
        npcDisplayNames.set(actorId, record.name);
      }

      if (record.profile) {
        npcProfiles.set(actorId, record.profile);
      }

      if (record.locationId !== 'unknown') {
        actorLocationIds.set(actorId, record.locationId);
        npcLocationIds.set(actorId, record.locationId);
      }
    });

    if (playerLocationId && playerLocationId !== 'unknown') {
      actorLocationIds.set(playerActorState?.actorId ?? `player:${ownerEmail}`, playerLocationId);
    }

    if (playerLocationId) {
      const playerLocationContext = await loadLocationContext(playerLocationId);
      resolvedLocationName = playerLocationContext.locationName ?? playerLocationId;
    }

    for (const npcStateRecord of npcStateRecords) {
      const actorId = npcStateRecord.actorState.actorId;

      const narratorHistory = await loadNarratorHistory(
        npcStateRecord.locationId !== 'unknown' ? npcStateRecord.locationId : playerLocationId
      );

      const llmProvider = resolveTurnLlmProvider(actorId, sessionKey);
      const relationships = extractRelationships(npcStateRecord.rawState['affinity']);
      const stateLocationContext = extractLocationContextFromState(npcStateRecord.rawState);
      const entityLocationContext = await loadLocationContext(
        npcStateRecord.locationId !== 'unknown' ? npcStateRecord.locationId : undefined
      );
      const locationName =
        stateLocationContext.locationName ??
        entityLocationContext.locationName ??
        (npcStateRecord.locationId !== 'unknown' ? npcStateRecord.locationId : undefined);
      const locationDescription =
        stateLocationContext.locationDescription ?? entityLocationContext.locationDescription;
      const currentActivity = toCurrentActivity(npcStateRecord.locationState);
      const playerProximity = resolvePlayerProximity(
        npcStateRecord.rawState,
        npcStateRecord.locationId,
        playerLocationId
      );
      npcProximityMap.set(actorId, playerProximity);
      const interruptible = npcStateRecord.locationState?.interruptible ?? true;
      const nearbyNpcSummaries = buildNearbyNpcSummaries(
        npcStateRecords,
        actorId,
        npcStateRecord.locationId
      );
      const nearbyActorIds =
        playerLocationId && npcStateRecord.locationId === playerLocationId
          ? buildNearbyActorIds(actorLocationIds, playerLocationId)
          : [];
      const contextExtras = {
        ...(relationships ? { relationships } : {}),
        ...(playerName ? { playerName } : {}),
        ...(playerDescription ? { playerDescription } : {}),
        ...(locationName ? { locationName } : {}),
        ...(locationDescription ? { locationDescription } : {}),
        ...(currentActivity ? { currentActivity } : {}),
        playerProximity,
        interruptible,
        ...(targetNpcId === actorId ? { playerAddressedDirectly: true } : {}),
        ...(nearbyNpcSummaries.length > 0 ? { nearbyNpcSummaries } : {}),
        ...(nearbyActorIds.length > 0 ? { nearbyActorIds } : {}),
        playerAppealTags,
        ...(startingScenario ? { startingScenario } : {}),
      } satisfies CognitionContextExtras;

      if (npcStateRecord.profile && llmProvider) {
        const contextTimestamp = new Date();
        npcDirectCognitionInputs.set(actorId, {
          context: {
            perception: {
              relevantEvents: [],
              nearbyActors: nearbyActorIds,
              ...(npcStateRecord.locationState
                ? { locationState: npcStateRecord.locationState }
                : {}),
              ...(narratorHistory.length > 0 ? { narratorHistory } : {}),
            },
            state: {
              id: actorId,
              type: 'npc',
              npcId: actorId,
              sessionId: sessionKey,
              locationId: npcStateRecord.locationId,
              spawnedAt: contextTimestamp,
              lastActiveAt: contextTimestamp,
              recentEvents: [],
              goals: [],
            },
            availableActions: ['SPEAK_INTENT'],
          },
          contextExtras,
          profile: npcStateRecord.profile,
          llmProvider,
        });
      }

      const existingActor = actorRegistry.get(actorId);
      if (existingActor instanceof NpcActor) {
        existingActor.setNarratorHistory(narratorHistory);
        existingActor.setContextExtras(contextExtras);
        continue;
      }

      const spawnConfig = {
        id: actorId,
        type: 'npc',
        npcId: actorId,
        sessionId: sessionKey,
        locationId: npcStateRecord.locationId,
        ...(npcStateRecord.profile ? { profile: npcStateRecord.profile } : {}),
        ...(npcMemoryProvider ? { memoryProvider: npcMemoryProvider } : {}),
        ...(llmProvider ? { llmProvider } : {}),
        narratorHistory,
        ...contextExtras,
      } satisfies ActorSpawnConfig & { playerAppealTags: string[] };

      actorRegistry.spawn(spawnConfig);
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
    const turnStartedAt = new Date();
    const classification = classifyPlayerInput(input);
    const playerSpoke: WorldEvent = {
      type: 'SPOKE',
      actorId: playerActorId,
      content: input,
      targetActorId: targetNpcId ?? undefined,
      sessionId: sessionKey,
      timestamp: turnStartedAt,
      inputMode: classification.mode,
      ...(classification.speechContent != null
        ? { speechContent: classification.speechContent }
        : {}),
      ...(classification.narrationContent != null
        ? { narrationContent: classification.narrationContent }
        : {}),
    };

    try {
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

    if (targetNpcId && !npcSpokeEvents.some((event) => event.actorId === targetNpcId)) {
      const directCognitionInput = npcDirectCognitionInputs.get(targetNpcId);

      if (directCognitionInput) {
        let episodicMemories: EpisodicMemorySummary[] | undefined;
        if (npcMemoryProvider) {
          try {
            episodicMemories = await npcMemoryProvider.getEpisodicMemories({
              sessionId: sessionKey,
              actorId: targetNpcId,
              recentContext: input,
            });
          } catch (error) {
            log.warn(
              { err: error, sessionId, actorId: targetNpcId },
              'failed to load episodic memories for direct cognition fallback',
            );
          }
        }

        try {
          const directActionResult = await resolveNpcCognitionWithTools({
            context: {
              ...directCognitionInput.context,
              perception: {
                ...directCognitionInput.context.perception,
                relevantEvents: [playerSpoke],
              },
            },
            profile: directCognitionInput.profile,
            llmProvider: directCognitionInput.llmProvider,
            contextExtras: directCognitionInput.contextExtras,
            ...(episodicMemories ? { episodicMemories } : {}),
            toolExecutors: buildToolExecutorMap({
              ownerEmail,
              sessionId: sessionKey,
              embeddingService: retrievalEmbeddingService,
            }),
          });

          const directSpokeEvent = toSpokeEventFromActionResult(directActionResult);
          if (directSpokeEvent) {
            try {
              await worldBus.emit(directSpokeEvent);
            } catch (error) {
              log.warn(
                { err: error, sessionId, actorId: targetNpcId },
                'failed to emit direct cognition spoke event',
              );
            }

            collected.push(directSpokeEvent);
            npcSpokeEvents.push(directSpokeEvent);
          }
        } catch (error) {
          log.warn(
            { err: error, sessionId, actorId: targetNpcId },
            'direct cognition with tools failed',
          );
        }
      }
    }

    // Build structured narration intents from collected SPOKE events
    const narrationIntents: NpcNarrationIntent[] = npcSpokeEvents.map((evt) => ({
      actorId: evt.actorId,
      name: npcDisplayNames.get(evt.actorId) ?? evt.actorId,
      dialogue: evt.content,
      ...(evt.action != null ? { action: evt.action } : {}),
      ...((evt.physicalAction ?? evt.action) != null ? { physicalAction: evt.physicalAction ?? evt.action } : {}),
      ...(evt.observation != null ? { observation: evt.observation } : {}),
      ...(evt.internalState != null ? { internalState: evt.internalState } : {}),
      ...(evt.sensoryDetail != null ? { sensoryDetail: evt.sensoryDetail } : {}),
      ...(evt.emotion != null ? { emotion: evt.emotion } : {}),
      ...(evt.targetActorId != null ? { targetActorId: evt.targetActorId } : {}),
    }));

    const spokenActorIds = new Set(npcSpokeEvents.map((event) => event.actorId));
    if (playerLocationId && playerLocationId !== 'unknown') {
      for (const [actorId, npcNarrationContext] of npcNarrationContexts.entries()) {
        if (spokenActorIds.has(actorId)) {
          continue;
        }

        if (npcNarrationContext.locationId !== playerLocationId) {
          continue;
        }

        const continuationActivity = npcNarrationContext.currentActivity?.description?.trim();
        if (!continuationActivity) {
          continue;
        }

        narrationIntents.push({
          actorId,
          name: npcNarrationContext.name,
          isContinuation: true,
          continuationActivity,
          physicalAction: continuationActivity,
        });
      }
    }

    if (narrationIntents.length === 0) {
      const response: TurnResponseDto = {
        message: 'The world is quiet.',
        events: collected,
        success: true,
      };
      return c.json(response, 200);
    }

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

    const characterSummaryActorIds = [...new Set(npcSpokeEvents.map((event) => event.actorId))];
    const characterSummaries = characterSummaryActorIds.map((actorId) =>
      buildNpcCharacterSummary(
        actorId,
        npcDisplayNames.get(actorId) ?? actorId,
        npcProfiles.get(actorId),
        npcProximityMap.get(actorId)
      )
    );
    const sceneProximity = resolveSceneProximity(
      narrationIntents.map((intent) => npcProximityMap.get(intent.actorId))
    );

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
      ...(characterSummaries.length > 0 ? { characterSummaries } : {}),
      ...(sceneProximity ? { sceneProximity } : {}),
    };

    let message: string;
    let narrationSource: 'llm' | 'fallback' | 'direct';
    const performedNarrationIntents = narrationIntents.filter(
      (intent) => !intent.isContinuation
    );

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

    const narratorMessageLocationId = resolveNarratorMessageLocationId(
      narrationIntents.map((intent) => intent.actorId),
      npcLocationIds,
      playerLocationId
    );

    await persistNarratorTurnMessage({
      sessionId: sessionKey,
      prose: message,
      source: narrationSource,
      npcSpokeEvents,
      turnStartedAt,
      ...(narratorMessageLocationId ? { locationId: narratorMessageLocationId } : {}),
    });

    if (retrievalEmbeddingService && performedNarrationIntents.length > 0) {
      try {
        const intentsByActor = new Map<string, NpcNarrationIntent[]>();
        for (const intent of performedNarrationIntents) {
          const existingIntents = intentsByActor.get(intent.actorId);
          if (existingIntents) {
            existingIntents.push(intent);
          } else {
            intentsByActor.set(intent.actorId, [intent]);
          }
        }

        const memoryWriteResults = await Promise.all(
          [...intentsByActor.entries()].map(async ([actorId, intents]) => {
            const memoryText = buildEpisodicMemoryText(intents);
            const importance = computeEpisodicImportance({
              hasDirectPlayerInteraction: true,
              hasObservation: collectIntentValues(intents, (intent) => intent.observation).length > 0,
              hasSensoryDetail: collectIntentValues(intents, (intent) => intent.sensoryDetail).length > 0,
              hasEmotionOrInternalState:
                collectIntentValues(intents, (intent) => intent.emotion).length > 0 ||
                collectIntentValues(intents, (intent) => intent.internalState).length > 0,
            });
            const decayRate = computeEpisodicDecayRate(importance);

            try {
              await writeEpisodicMemory(
                {
                  sessionId: sessionKey,
                  actorId,
                  learnedAt: new Date(),
                  content: memoryText,
                  summary: buildEpisodicMemorySummary(memoryText),
                  importance,
                  decayRate,
                  sourceType: 'performed',
                },
                retrievalEmbeddingService,
                { ownerEmail },
              );

              return {
                actorId,
                success: true as const,
              };
            } catch (error) {
              return {
                actorId,
                success: false as const,
                reason: error instanceof Error ? error.message : String(error),
              };
            }
          }),
        );

        const failedMemoryWrites = memoryWriteResults.filter((result) => !result.success);

        if (failedMemoryWrites.length > 0) {
          log.warn(
            {
              sessionId,
              failedActorIds: failedMemoryWrites.map((failure) => failure.actorId),
              errors: failedMemoryWrites.map((failure) => failure.reason),
            },
            'failed to write some episodic memories',
          );
        }
      } catch (error) {
        log.warn({ err: error, sessionId }, 'failed to write episodic memories');
      }
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

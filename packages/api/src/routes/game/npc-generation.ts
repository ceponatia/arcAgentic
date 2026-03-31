import type { Context, Hono } from 'hono';
import { createLogger } from '@arcagentic/logger';
import {
  generateNpc,
  generateNpcBatch,
  expandNpcProfile,
  type NpcGenDeps,
} from '@arcagentic/generator';
import {
  actorStates,
  drizzle,
  getEntityProfile,
  getLocation,
  getLocationMap,
  getSession,
  getSessionProjection,
  listActorStatesForSession,
} from '@arcagentic/db/node';
import {
  BatchGenerationRequestSchema,
  CharacterProfileSchema,
  extractLocationId,
  isRecord,
  NpcPopulationConfigSchema,
  NpcExpansionRequestSchema,
  NpcGenerationRequestSchema,
  type NpcActorState,
  type CharacterProfile,
  type NpcGenerationContext,
  type NpcActorRole,
  type SettingProfile,
} from '@arcagentic/schemas';
import {
  OpenAIProvider,
  TieredCognitionRouter,
  createOpenRouterProviderFromEnv,
} from '@arcagentic/llm';
import { z } from 'zod';
import type { LoadedDataGetter } from '../../loaders/types.js';
import { getOwnerEmail } from '../../auth/ownerEmail.js';
import { generateSeedNpcs } from '../../services/npc-seeding.js';
import { getEnvValue } from '../../utils/env.js';
import { badRequest, notFound, serverError } from '../../utils/responses.js';
import { validateBody, validateParam } from '../../utils/request-validation.js';
import { isUuid, toId, toSessionId } from '../../utils/uuid.js';
import { generateId, generateInstanceId } from '@arcagentic/utils';
import { findSetting } from './sessions/shared.js';

const log = createLogger('api', 'npc-generation');

const openaiApiKey = getEnvValue('OPENAI_API_KEY') ?? '';
const openaiModel = getEnvValue('OPENAI_MODEL') ?? 'gpt-4o-mini';
const openaiBaseUrl = getEnvValue('OPENAI_BASE_URL');

const defaultGenerationLlmProvider =
  createOpenRouterProviderFromEnv({ id: 'npc-generation' }) ??
  (openaiApiKey
    ? new OpenAIProvider({
      id: 'npc-generation-openai',
      apiKey: openaiApiKey,
      model: openaiModel,
      ...(openaiBaseUrl ? { baseURL: openaiBaseUrl } : {}),
    })
    : null);

const defaultGenerationRouter = defaultGenerationLlmProvider
  ? new TieredCognitionRouter({
    fast: defaultGenerationLlmProvider,
    deep: defaultGenerationLlmProvider,
    reasoning: defaultGenerationLlmProvider,
  })
  : null;

const ContextEnrichmentSchema = z.object({
  sessionId: z.string().uuid().optional(),
  locationId: z.string().trim().min(1).optional(),
});

const GenerateNpcRouteRequestSchema = NpcGenerationRequestSchema.merge(ContextEnrichmentSchema);
const GenerateNpcBatchRouteRequestSchema = BatchGenerationRequestSchema.merge(
  ContextEnrichmentSchema
);
const SeedNpcRouteRequestSchema = z.object({
  sessionId: z.string().uuid(),
  locationId: z.string().trim().min(1).optional(),
  config: NpcPopulationConfigSchema.optional(),
});
const NpcIdParamSchema = z.string().trim().min(1);

interface NpcGenerationRouteDeps {
  getLoaded: LoadedDataGetter;
}

interface SessionRecord {
  id: string;
  settingId?: string | null;
  locationMapId?: string | null;
}

type ActorStateRow = Awaited<ReturnType<typeof listActorStatesForSession>>[number];
type LocationMapRecord = NonNullable<Awaited<ReturnType<typeof getLocationMap>>>;
type LocationNodeRecord = LocationMapRecord['nodesJson'][number];
type LocationRecord = NonNullable<Awaited<ReturnType<typeof getLocation>>>;
type ContextEnrichment = z.infer<typeof ContextEnrichmentSchema>;

type ContextLoadResult =
  | {
    success: true;
    context: NpcGenerationContext;
  }
  | {
    success: false;
    response: Response;
  };

function createGenerationDeps(): NpcGenDeps {
  return defaultGenerationRouter ? { cognitionRouter: defaultGenerationRouter } : {};
}

function resolveSeedRole(profile: CharacterProfile): NpcActorRole {
  return profile.tier === 'major' || profile.tier === 'minor' ? 'supporting' : 'background';
}

function buildSeedActorState(
  profile: CharacterProfile,
  locationId: string,
): NpcActorState {
  return {
    role: resolveSeedRole(profile),
    tier: profile.tier,
    label: null,
    name: profile.name,
    profileJson: JSON.stringify(profile),
    location: { currentLocationId: locationId },
    status: 'active',
  };
}

function mergeDefined<T extends object>(
  base: T | undefined,
  override: T | undefined
): T | undefined {
  if (base && override) {
    return { ...base, ...override };
  }

  return override ?? base;
}

function mergeGenerationContext(
  loadedContext: NpcGenerationContext,
  requestContext: NpcGenerationContext
): NpcGenerationContext {
  return {
    setting: mergeDefined(loadedContext.setting, requestContext.setting),
    location: mergeDefined(loadedContext.location, requestContext.location),
    player: mergeDefined(loadedContext.player, requestContext.player),
    existingNpcs: requestContext.existingNpcs ?? loadedContext.existingNpcs,
    archetype: requestContext.archetype ?? loadedContext.archetype,
    nameOverride: requestContext.nameOverride ?? loadedContext.nameOverride,
  };
}

function normalizeString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStringList(values: string[] | null | undefined): string[] {
  return (values ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function buildSettingContext(
  setting: SettingProfile
): NonNullable<NpcGenerationContext['setting']> {
  return {
    era: normalizeString(setting.name) ?? 'Unknown era',
    tone: normalizeString(setting.tone) ?? 'grounded',
    themes: normalizeStringList(setting.themes ?? setting.tags),
  };
}

function buildLocationContextFromNode(
  node: LocationNodeRecord
): NonNullable<NpcGenerationContext['location']> {
  return {
    name: node.name,
    description: normalizeString(node.description) ?? normalizeString(node.summary) ?? '',
    type: node.type,
    tags: normalizeStringList(node.tags),
  };
}

function buildLocationContextFromRecord(
  location: LocationRecord
): NonNullable<NpcGenerationContext['location']> {
  return {
    name: location.name,
    description:
      normalizeString(location.description) ?? normalizeString(location.summary) ?? '',
    type: normalizeString(location.type) ?? 'room',
    tags: normalizeStringList(location.tags),
  };
}

function parseCharacterProfile(raw: unknown): CharacterProfile | null {
  if (!raw) {
    return null;
  }

  const candidate =
    typeof raw === 'string'
      ? (() => {
        try {
          return JSON.parse(raw) as unknown;
        } catch {
          return null;
        }
      })()
      : raw;

  if (!candidate) {
    return null;
  }

  const parsed = CharacterProfileSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function getActorLocationId(state: unknown): string | undefined {
  if (!isRecord(state)) {
    return undefined;
  }

  const locationState = state['location'];
  if (isRecord(locationState)) {
    const currentLocationId = locationState['currentLocationId'];
    if (typeof currentLocationId === 'string' && currentLocationId.trim().length > 0) {
      return currentLocationId;
    }
  }

  const locationId = state['locationId'];
  if (typeof locationId === 'string' && locationId.trim().length > 0) {
    return locationId;
  }

  const currentLocationId = state['currentLocationId'];
  if (typeof currentLocationId === 'string' && currentLocationId.trim().length > 0) {
    return currentLocationId;
  }

  return undefined;
}

function toExistingNpcContext(
  profile: CharacterProfile
): NonNullable<NpcGenerationContext['existingNpcs']>[number] {
  return {
    name: profile.name,
    race: profile.race,
    ...(profile.gender ? { gender: profile.gender } : {}),
    ...(profile.occupation ? { occupation: profile.occupation } : {}),
    tier: profile.tier,
  };
}

async function resolveNpcProfile(actorState: ActorStateRow): Promise<CharacterProfile | null> {
  const state = isRecord(actorState.state) ? actorState.state : undefined;
  const stateProfile = parseCharacterProfile(state?.['profileJson'] ?? state?.['profile']);

  if (stateProfile) {
    return stateProfile;
  }

  if (!actorState.entityProfileId) {
    return null;
  }

  try {
    const entityProfile = await getEntityProfile(actorState.entityProfileId);
    return parseCharacterProfile(entityProfile?.profileJson);
  } catch (error) {
    log.warn(
      {
        err: error,
        actorId: actorState.actorId,
        entityProfileId: actorState.entityProfileId,
      },
      'failed to load existing npc profile for generation context'
    );
    return null;
  }
}

async function loadLocationContext(
  locationId: string,
  session: SessionRecord | null
): Promise<NonNullable<NpcGenerationContext['location']> | null> {
  const locationMapId = session?.locationMapId;

  if (locationMapId && isUuid(locationMapId)) {
    const locationMap = await getLocationMap(toId(locationMapId));
    const locationNode = locationMap?.nodesJson.find((node) => node.id === locationId);

    if (locationNode) {
      return buildLocationContextFromNode(locationNode);
    }
  }

  if (!isUuid(locationId)) {
    return null;
  }

  const location = await getLocation(toId(locationId));
  return location ? buildLocationContextFromRecord(location) : null;
}

async function loadExistingNpcsForLocation(
  sessionId: string,
  locationId: string
): Promise<NonNullable<NpcGenerationContext['existingNpcs']> | undefined> {
  const actorStates = await listActorStatesForSession(toSessionId(sessionId));
  const matchingNpcStates = actorStates.filter((actorState) => {
    if (actorState.actorType !== 'npc') {
      return false;
    }

    return getActorLocationId(actorState.state) === locationId;
  });

  const profiles = await Promise.all(
    matchingNpcStates.map(async (actorState) => resolveNpcProfile(actorState))
  );

  const existingNpcs = profiles
    .flatMap((profile) => (profile ? [toExistingNpcContext(profile)] : []));

  return existingNpcs.length > 0 ? existingNpcs : undefined;
}

async function loadGenerationContext(
  c: Context,
  getLoaded: LoadedDataGetter,
  enrichment: ContextEnrichment
): Promise<ContextLoadResult> {
  const context: NpcGenerationContext = {};
  let session: SessionRecord | null = null;

  if (enrichment.sessionId) {
    const ownerEmail = getOwnerEmail(c);
    session = (await getSession(toSessionId(enrichment.sessionId), ownerEmail)) as SessionRecord | null;

    if (!session) {
      return {
        success: false,
        response: notFound(c, 'session not found'),
      };
    }

    if (session.settingId) {
      const loaded = getLoaded();
      if (!loaded) {
        return {
          success: false,
          response: serverError(c, 'data not loaded'),
        };
      }

      const setting = await findSetting(loaded, session.settingId);
      if (!setting) {
        return {
          success: false,
          response: notFound(c, 'setting not found'),
        };
      }

      context.setting = buildSettingContext(setting);
    }
  }

  if (enrichment.locationId) {
    const location = await loadLocationContext(enrichment.locationId, session);
    if (!location) {
      return {
        success: false,
        response: notFound(c, 'location not found'),
      };
    }

    context.location = location;

    if (enrichment.sessionId) {
      const existingNpcs = await loadExistingNpcsForLocation(
        enrichment.sessionId,
        enrichment.locationId
      );

      if (existingNpcs) {
        context.existingNpcs = existingNpcs;
      }
    }
  }

  return {
    success: true,
    context,
  };
}

async function resolveSeedLocationId(
  session: SessionRecord,
  requestedLocationId: string | undefined,
): Promise<string | undefined> {
  if (requestedLocationId) {
    return requestedLocationId;
  }

  const projection = await getSessionProjection(toSessionId(session.id));
  const projectionLocationId = extractLocationId(projection?.location);

  if (projectionLocationId) {
    return projectionLocationId;
  }

  if (session.locationMapId && isUuid(session.locationMapId)) {
    const locationMap = await getLocationMap(toId(session.locationMapId));
    const defaultStartLocationId = normalizeString(locationMap?.defaultStartLocationId);

    if (defaultStartLocationId) {
      return defaultStartLocationId;
    }
  }

  return undefined;
}

export function registerNpcGenerationRoutes(
  app: Hono,
  deps: NpcGenerationRouteDeps
): void {
  app.post('/npcs/generate', async (c) => {
    const bodyResult = await validateBody(c, GenerateNpcRouteRequestSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const { sessionId, locationId, ...request } = bodyResult.data;
    const contextResult = await loadGenerationContext(c, deps.getLoaded, {
      sessionId,
      locationId,
    });

    if (!contextResult.success) {
      return contextResult.response;
    }

    try {
      const result = await generateNpc(
        {
          ...request,
          context: mergeGenerationContext(contextResult.context, request.context),
        },
        createGenerationDeps()
      );

      return c.json(result, 200);
    } catch (error) {
      log.error({ err: error, sessionId, locationId }, 'single npc generation failed');
      return serverError(c, 'failed to generate npc');
    }
  });

  app.post('/npcs/generate/batch', async (c) => {
    const bodyResult = await validateBody(c, GenerateNpcBatchRouteRequestSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const { sessionId, locationId, ...request } = bodyResult.data;
    const contextResult = await loadGenerationContext(c, deps.getLoaded, {
      sessionId,
      locationId,
    });

    if (!contextResult.success) {
      return contextResult.response;
    }

    try {
      const result = await generateNpcBatch(
        {
          ...request,
          context: mergeGenerationContext(contextResult.context, request.context),
        },
        createGenerationDeps()
      );

      return c.json(result, 200);
    } catch (error) {
      log.error({ err: error, sessionId, locationId }, 'batch npc generation failed');
      return serverError(c, 'failed to generate npc batch');
    }
  });

  app.post('/npcs/seed', async (c) => {
    const bodyResult = await validateBody(c, SeedNpcRouteRequestSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const ownerEmail = getOwnerEmail(c);
    const session = (await getSession(
      toSessionId(bodyResult.data.sessionId),
      ownerEmail
    )) as SessionRecord | null;

    if (!session) {
      return notFound(c, 'session not found');
    }

    const locationId = await resolveSeedLocationId(session, bodyResult.data.locationId);
    if (!locationId) {
      return badRequest(c, 'locationId is required when the session has no current location');
    }

    const contextResult = await loadGenerationContext(c, deps.getLoaded, {
      sessionId: bodyResult.data.sessionId,
      locationId,
    });

    if (!contextResult.success) {
      return contextResult.response;
    }

    try {
      const result = await generateSeedNpcs(
        contextResult.context,
        bodyResult.data.config,
        createGenerationDeps()
      );

      const profiles = result.npcs.map((npc) => CharacterProfileSchema.parse(npc));

      const actorIds = await drizzle.transaction(async (tx) => {
        const createdActorIds: string[] = [];

        for (const profile of profiles) {
          const actorId = generateInstanceId(profile.id);

          await tx.insert(actorStates).values({
            id: toId(generateId()),
            sessionId: toSessionId(bodyResult.data.sessionId),
            actorType: 'npc',
            actorId,
            entityProfileId: null,
            state: buildSeedActorState(profile, locationId),
            lastEventSeq: 0n,
          });

          createdActorIds.push(actorId);
        }

        return createdActorIds;
      });

      log.info(
        {
          sessionId: bodyResult.data.sessionId,
          locationId,
          generated: result.npcs.length,
          actorIds,
        },
        'seeded session npcs'
      );

      return c.json({ ...result, actorIds, locationId }, 201);
    } catch (error) {
      log.error(
        {
          err: error,
          sessionId: bodyResult.data.sessionId,
          locationId,
        },
        'session npc seeding failed'
      );
      return serverError(c, 'failed to seed session npcs');
    }
  });

  app.post('/npcs/:id/expand', async (c) => {
    const npcIdResult = validateParam(c, 'id', NpcIdParamSchema);
    if (!npcIdResult.success) return npcIdResult.errorResponse;

    const bodyResult = await validateBody(c, NpcExpansionRequestSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    if (bodyResult.data.existingProfile.id !== npcIdResult.data) {
      return badRequest(c, 'npc id does not match existing profile id');
    }

    try {
      const result = await expandNpcProfile(bodyResult.data, createGenerationDeps());
      return c.json(result, 200);
    } catch (error) {
      log.error({ err: error, npcId: npcIdResult.data }, 'npc expansion failed');
      return serverError(c, 'failed to expand npc');
    }
  });
}

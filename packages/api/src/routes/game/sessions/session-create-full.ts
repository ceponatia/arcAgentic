/**
 * Transactional Session Creation API
 * POST /sessions/create-full
 *
 * Creates a complete session with all related entities in a single atomic transaction.
 * This replaces the fragile multi-request session creation flow.
 */
import type { Context } from 'hono';
import { createLogger } from '@arcagentic/logger';
import {
  CreateFullSessionRequestSchema,
  DEFAULT_TIME_CONFIG,
  createInitialTimeState,
  type CreateFullSessionResponse,
} from '@arcagentic/schemas';
import {
  drizzle,
  sessions,
  sessionProjections,
  actorStates,
  sessionTags,
  promptTags,
  inArray,
} from '@arcagentic/db/node';
import { ensureUserByEmail, getEntityProfile } from '@arcagentic/db/node';
import type { LoadedDataGetter } from '../../../loaders/types.js';
import { badRequest, serverError, notFound } from '../../../utils/responses.js';
import { generateId, generateInstanceId, isUuid } from '@arcagentic/utils';
import { findCharacter, findSetting } from './shared.js';
import { getAuthUser } from '../../../auth/middleware.js';
import { toSessionId, toId, toIds } from '../../../utils/uuid.js';
import type { CharacterProfile } from '@arcagentic/schemas';
import { validateBody } from '../../../utils/request-validation.js';

const log = createLogger('api', 'sessions');

export type { CreateFullSessionRequest, CreateFullSessionResponse } from '@arcagentic/schemas';

/**
 * Handle POST /sessions/create-full
 * Creates a session with all related entities in a single transaction.
 */
export async function handleCreateFullSession(
  c: Context,
  getLoaded: LoadedDataGetter
): Promise<Response> {
  log.info('full session create request received');

  const user = getAuthUser(c);
  const ownerEmail = user?.email ?? user?.identifier;

  if (!ownerEmail) {
    return badRequest(c, 'authenticated user required with email/identifier');
  }

  // sessions.owner_email references user_accounts.email via FK.
  // Ensure a matching user row exists to prevent FK violations.
  try {
    await ensureUserByEmail({
      email: ownerEmail,
      identifier: ownerEmail,
      displayName: user?.identifier ?? null,
      role: user?.role === 'admin' ? 'admin' : 'user',
    });
  } catch (err) {
    log.error({ err, ownerEmail }, 'failed to ensure user account for owner email');
    return serverError(c, 'failed to ensure user account');
  }

  const loaded = getLoaded();
  if (!loaded) {
    log.error('data not loaded for full session creation');
    return serverError(c, 'data not loaded');
  }

  const bodyResult = await validateBody(c, CreateFullSessionRequestSchema);
  if (!bodyResult.success) return bodyResult.errorResponse;

  const request = bodyResult.data;

  // Validate setting exists
  const setting = await findSetting(loaded, request.settingId);
  if (!setting) {
    return notFound(c, `setting not found: ${request.settingId}`);
  }

  // Validate all NPC characters exist
  const npcCharacters = new Map<string, (typeof loaded)['characters'][0]>();
  for (const npc of request.npcs) {
    const character = await findCharacter(loaded, npc.characterId);
    if (!character) {
      return notFound(c, `character not found: ${npc.characterId}`);
    }
    npcCharacters.set(npc.characterId, character);
  }

  // Validate persona exists if provided
  let personaProfile: CharacterProfile | Record<string, unknown> | null = null;
  if (request.personaId) {
    const persona = await getEntityProfile(toId(request.personaId));

    if (persona?.entityType !== 'persona') {
      return notFound(c, `persona not found: ${request.personaId}`);
    }

    personaProfile = persona.profileJson as CharacterProfile | Record<string, unknown>;
  }

  // Validate tags exist if provided
  if (request.tags && request.tags.length > 0) {
    const tagIds = request.tags.map((t) => t.tagId);
    const tagResult = await drizzle
      .select()
      .from(promptTags)
      .where(inArray(promptTags.id, toIds(tagIds)));
    const foundTagIds = new Set(tagResult.map((r) => r.id));
    const missingTags = tagIds.filter((id) => !foundTagIds.has(id));
    if (missingTags.length > 0) {
      return notFound(c, `tags not found: ${missingTags.join(', ')}`);
    }
  }

  // Generate IDs
  const sessionId = generateId();
  const secondsPerTurn = request.secondsPerTurn ?? setting.timeConfig?.secondsPerTurn ?? 60;
  const createdAt = new Date().toISOString();
  const defaultStartTimeBase = setting.timeConfig?.defaultStartTime ?? DEFAULT_TIME_CONFIG.defaultStartTime;
  const dayPeriods =
    setting.timeConfig?.dayPeriods.map((period) =>
      period.description
        ? { name: period.name, startHour: period.startHour, description: period.description }
        : { name: period.name, startHour: period.startHour }
    ) ?? DEFAULT_TIME_CONFIG.dayPeriods;
  const initialTimeConfig: Parameters<typeof createInitialTimeState>[0] = {
    ...DEFAULT_TIME_CONFIG,
    secondsPerTurn,
    hoursPerDay: setting.timeConfig?.hoursPerDay ?? DEFAULT_TIME_CONFIG.hoursPerDay,
    daysPerWeek: setting.timeConfig?.daysPerWeek ?? DEFAULT_TIME_CONFIG.daysPerWeek,
    daysPerMonth: setting.timeConfig?.daysPerMonth ?? DEFAULT_TIME_CONFIG.daysPerMonth,
    monthsPerYear: setting.timeConfig?.monthsPerYear ?? DEFAULT_TIME_CONFIG.monthsPerYear,
    dayPeriods,
    defaultStartTime: defaultStartTimeBase,
    simulateOfflineTime:
      setting.timeConfig?.simulateOfflineTime ?? DEFAULT_TIME_CONFIG.simulateOfflineTime,
    maxOfflineHours: setting.timeConfig?.maxOfflineHours ?? DEFAULT_TIME_CONFIG.maxOfflineHours,
  };
  const defaultStartTime = request.startTime
    ? (() => {
      const year = request.startTime.year ?? initialTimeConfig.defaultStartTime.year;
      const month = request.startTime.month ?? initialTimeConfig.defaultStartTime.month;
      const dayOfMonth = request.startTime.day ?? initialTimeConfig.defaultStartTime.dayOfMonth;

      return {
        ...initialTimeConfig.defaultStartTime,
        year,
        month,
        dayOfMonth,
        absoluteDay:
          (year - 1) * initialTimeConfig.monthsPerYear * initialTimeConfig.daysPerMonth +
          (month - 1) * initialTimeConfig.daysPerMonth +
          dayOfMonth,
        hour: request.startTime.hour,
        minute: request.startTime.minute,
      };
    })()
    : initialTimeConfig.defaultStartTime;
  const initialTimeState = createInitialTimeState({
    ...initialTimeConfig,
    defaultStartTime,
  });

  // Prepare NPC instance data
  const npcInstances: {
    id: string;
    characterId: string;
    character: (typeof loaded)['characters'][0];
    role: string;
    tier: string;
    label: string | null;
    startLocationId: string | null;
  }[] = [];

  for (const npc of request.npcs) {
    const character = npcCharacters.get(npc.characterId);
    if (character) {
      npcInstances.push({
        id: generateInstanceId(npc.characterId),
        characterId: npc.characterId,
        character,
        role: npc.role,
        tier: npc.tier,
        label: npc.label ?? null,
        startLocationId: npc.startLocationId ?? null,
      });
    }
  }

  if (npcInstances.length === 0) {
    return badRequest(c, 'at least one npc is required');
  }

  // Determine primary NPC (first one with role 'primary', or first NPC)
  const primaryNpc = npcInstances.find((n) => n.role === 'primary') ?? npcInstances[0];

  try {
    const responseData = await drizzle.transaction(async (tx) => {
      // 1. Create session
      log.info({ sessionId, ownerEmail }, 'creating full session');
      await tx.insert(sessions).values({
        id: toId(sessionId),
        ownerEmail,
        name: `Session ${sessionId.substring(0, 8)}`,
        // Note: many built-in/test profiles use non-UUID IDs (e.g. "test-setting-001").
        // These session columns are UUID foreign keys, so we only persist IDs when the
        // request carries real UUID-backed entity profile IDs and otherwise leave them null.
        playerCharacterId:
          request.personaId && isUuid(request.personaId) ? toId(request.personaId) : null,
        settingId: isUuid(request.settingId) ? toId(request.settingId) : null,
        status: 'active',
      });

      // 2. Create session projection
      await tx.insert(sessionProjections).values({
        sessionId: toSessionId(sessionId),
        location: request.startLocationId ? { currentLocationId: request.startLocationId } : {},
        inventory: {},
        time: initialTimeState,
        worldState: {},
        lastEventSeq: 0n,
      });

      // Helper to resolve actor ID (template ID or 'player') to instance ID or 'player'
      const resolveActorId = (actorId: string): string | null => {
        if (actorId === 'player') return 'player';
        const instance = npcInstances.find((n) => n.characterId === actorId);
        return instance ? instance.id : null;
      };

      // 3. Create NPC actor states
      for (const npc of npcInstances) {
        log.info({ sessionId, npcInstanceId: npc.id, characterId: npc.characterId }, 'creating npc actor state');

        interface AffinityState {
          relationshipType: string;
          affinity: {
            trust: number;
            fondness: number;
            fear: number;
          };
          createdAt: string;
        }

        const affinity = new Map<string, AffinityState>();
        if (request.relationships) {
          for (const rel of request.relationships) {
            const fromInstanceId = resolveActorId(rel.fromActorId);
            const toInstanceId = resolveActorId(rel.toActorId);

            if (toInstanceId === npc.id && fromInstanceId) {
              affinity.set(fromInstanceId, {
                relationshipType: rel.relationshipType,
                affinity: {
                  trust: rel.affinitySeed?.trust ?? 0.5,
                  fondness: rel.affinitySeed?.fondness ?? 0.5,
                  fear: rel.affinitySeed?.fear ?? 0.0,
                },
                createdAt,
              });
            }
          }
        }

        const affinityState = Object.fromEntries(affinity);

        await tx.insert(actorStates).values({
          id: toId(generateId()),
          sessionId: toSessionId(sessionId),
          actorType: 'npc',
          actorId: npc.id,
          entityProfileId: null,
          state: {
            role: npc.role,
            tier: npc.tier,
            label: npc.label,
            name: npc.character.name,
            profileJson: JSON.stringify(npc.character),
            location: npc.startLocationId ? { currentLocationId: npc.startLocationId } : undefined,
            affinity: affinityState,
            status: 'active',
          },
          lastEventSeq: 0n,
        });
      }

      // 4. Attach persona to session if provided
      if (request.personaId && personaProfile) {
        log.info({ sessionId, personaId: request.personaId }, 'attaching persona to session');
        await tx.insert(actorStates).values({
          id: toId(generateId()),
          sessionId: toSessionId(sessionId),
          actorType: 'player',
          actorId: 'player',
          entityProfileId: null,
          state: {
            profile: personaProfile,
            status: 'active',
          },
          lastEventSeq: 0n,
        });
      }

      // 5. Create tag bindings
      const tagBindings: {
        id: string;
        tagId: string;
        targetType: string;
        targetEntityId: string | null;
      }[] = [];

      const insertedTagIds = new Set<string>();

      if (request.tags) {
        for (const tag of request.tags) {
          const bindingId = generateId();
          const normalized = (
            'scope' in tag
              ? {
                tagId: tag.tagId,
                targetType: tag.scope,
                targetEntityId: tag.targetId ?? null,
              }
              : {
                tagId: tag.tagId,
                targetType: tag.targetType,
                targetEntityId: tag.targetEntityId ?? null,
              }
          ) as { tagId: string; targetType: string; targetEntityId: string | null };

          let targetEntityId: string | null = normalized.targetEntityId;

          // If binding targets a character/NPC by template ID, resolve to the instance ID created in this session.
          if (
            (normalized.targetType === 'npc' || normalized.targetType === 'character') &&
            targetEntityId
          ) {
            const npcInstance = npcInstances.find((n) => n.characterId === targetEntityId);
            targetEntityId = npcInstance?.id ?? targetEntityId;
          }

          // The current DB model stores tags at the session level (unique by sessionId+tagId).
          // The UI may expand a single tag into multiple bindings (e.g. per-character targets),
          // so we dedupe inserts to avoid unique constraint violations.
          if (!insertedTagIds.has(normalized.tagId)) {
            insertedTagIds.add(normalized.tagId);
            await tx.insert(sessionTags).values({
              id: toId(bindingId),
              sessionId: toSessionId(sessionId),
              tagId: toId(normalized.tagId),
              enabled: true,
            });
          }

          tagBindings.push({
            id: bindingId,
            tagId: normalized.tagId,
            targetType: normalized.targetType,
            targetEntityId,
          });
        }
      }

      // 6. Relationship Results
      const relationshipResults: {
        fromActorId: string;
        toActorId: string;
        relationshipType: string;
      }[] = [];
      if (request.relationships) {
        for (const rel of request.relationships) {
          relationshipResults.push({
            fromActorId: rel.fromActorId,
            toActorId: rel.toActorId,
            relationshipType: rel.relationshipType,
          });
        }
      }

      return {
        tagBindings,
        relationshipResults,
      };
    });

    log.info({ sessionId }, 'full session created successfully');

    // Build response
    const response: CreateFullSessionResponse = {
      id: sessionId,
      settingId: request.settingId,
      playerCharacterId: primaryNpc?.characterId ?? '',
      personaId: request.personaId ?? null,
      startLocationId: request.startLocationId ?? null,
      secondsPerTurn,
      createdAt,
      npcs: npcInstances.map((npc) => ({
        instanceId: npc.id,
        templateId: npc.characterId,
        role: npc.role,
        tier: npc.tier,
        label: npc.label,
        startLocationId: npc.startLocationId,
      })),
      tagBindings: responseData.tagBindings,
      relationships: responseData.relationshipResults,
    };

    return c.json(response, 201);
  } catch (err) {
    log.error({ err, sessionId }, 'failed to create full session');
    return serverError(c, `failed to create session: ${(err as Error).message}`);
  }
}

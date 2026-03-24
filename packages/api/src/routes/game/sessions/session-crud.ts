import type { Context } from 'hono';
import { createLogger } from '@arcagentic/logger';
import {
  createSession,
  getSession,
  deleteSession,
  getPromptTag,
  createSessionTagBinding,
  upsertActorState,
  getSessionProjection,
  getEventsForSession,
} from '@arcagentic/db/node';
import type { LoadedDataGetter } from '../../../loaders/types.js';
import { notFound, badRequest, serverError } from '../../../utils/responses.js';
import { jsonifyBigInts } from '../../../utils/json.js';
import { generateId } from '@arcagentic/utils';
import { CreateSessionRequestSchema, findCharacter, findSetting } from './shared.js';
import { getOwnerEmail } from '../../../auth/ownerEmail.js';
import { toId, toSessionId } from '../../../utils/uuid.js';
import { primeSessionSequence } from '../../../services/event-persistence.js';
import { mapSpokeEventsToMessages } from './message-mapping.js';
import { createMessageMappingDeps } from './message-mapping-deps.js';
import { validateBody, validateParamId } from '../../../utils/request-validation.js';

const log = createLogger('api', 'sessions');

type DbEvent = Awaited<ReturnType<typeof getEventsForSession>>[number];
type SpokeEventRecord = DbEvent & { actorId: string; type: 'SPOKE' };

export async function handleGetSession(c: Context): Promise<Response> {
  const idResult = validateParamId(c, 'id');
  if (!idResult.success) return idResult.errorResponse;
  const id = idResult.data;
  const ownerEmail = getOwnerEmail(c);
  // getSession(id, ownerEmail) is from /db/node (sessions repository)
  const session = await getSession(toSessionId(id), ownerEmail);
  if (!session) return notFound(c, 'session not found');

  const projection = await getSessionProjection(toSessionId(id));

  // Fetch messages from events
  const allEvents = await getEventsForSession(toSessionId(id));
  primeSessionSequence(id, allEvents);
  const spokeEvents: SpokeEventRecord[] = allEvents.filter(
    (event): event is SpokeEventRecord => event.type === 'SPOKE' && typeof event.actorId === 'string'
  );

  const messages = await mapSpokeEventsToMessages(spokeEvents, createMessageMappingDeps(id));

  return c.json(jsonifyBigInts({ ...session, projection, messages }), 200);
}

export async function handleCreateSession(
  c: Context,
  getLoaded: LoadedDataGetter
): Promise<Response> {
  const ownerEmail = getOwnerEmail(c);
  log.info({ ownerEmail }, 'session create request received');
  const loaded = getLoaded();
  if (!loaded) {
    log.error('data not loaded for session creation');
    return serverError(c, 'data not loaded');
  }

  const bodyResult = await validateBody(c, CreateSessionRequestSchema);
  if (!bodyResult.success) return bodyResult.errorResponse;

  const { characterId, settingId, tagIds } = bodyResult.data;
  const character = await findCharacter(loaded, characterId);
  const setting = await findSetting(loaded, settingId);

  if (!character || !setting) {
    log.error({ characterId, settingId }, 'character or setting not found for session creation');
    return badRequest(c, 'characterId or settingId not found');
  }

  const sessionId = toSessionId(generateId());

  log.info({ sessionId, ownerEmail }, 'creating session');
  const sessionRecord = await createSession({
    id: sessionId,
    ownerEmail,
    characterTemplateId: character.id,
    settingTemplateId: setting.id,
  });

  if (!sessionRecord) {
    return serverError(c, 'failed to create session');
  }

  try {
    // Replaced legacy instance creation with primary actor state
    await upsertActorState({
      sessionId: toSessionId(sessionRecord.id),
      actorType: 'player',
      actorId: 'player',
      entityProfileId: toId(character.id),
      state: { status: 'active' },
      lastEventSeq: 0n,
    });

    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      log.info({ sessionId: sessionRecord.id, tagCount: tagIds.length }, 'creating session tag bindings');
      for (const tid of tagIds) {
        if (typeof tid === 'string') {
          const t = await getPromptTag(tid);
          if (t) {
            await createSessionTagBinding(ownerEmail, {
              sessionId: sessionRecord.id,
              tagId: tid,
              enabled: true,
            });
          }
        }
      }
    }
  } catch (err) {
    log.error({ err, sessionId: sessionRecord.id }, 'failed to prepare session state; rolling back');
    await deleteSession(sessionRecord.id, ownerEmail).catch(() => undefined);
    return serverError(c, 'failed to create session instances');
  }

  const response = {
    id: sessionRecord.id,
    playerCharacterId: sessionRecord.playerCharacterId ?? character.id,
    settingId: sessionRecord.settingId ?? setting.id,
    createdAt: sessionRecord.createdAt.toISOString(),
  };

  log.info({ sessionId: sessionRecord.id }, 'session created successfully');
  return c.json(response, 201);
}

export async function handleDeleteSession(c: Context): Promise<Response> {
  const idResult = validateParamId(c, 'id');
  if (!idResult.success) return idResult.errorResponse;
  const id = idResult.data;
  const ownerEmail = getOwnerEmail(c);
  await deleteSession(toSessionId(id), ownerEmail);
  return c.body(null, 204);
}

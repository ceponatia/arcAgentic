import type { Context } from 'hono';
import { listSessions, getEntityProfile, getActorState } from '@arcagentic/db/node';
import { getOwnerEmail } from '../../../auth/ownerEmail.js';
import { toId } from '../../../utils/uuid.js';

interface SessionRecord {
  id: string;
  name: string;
  playerCharacterId?: string | null;
  settingId?: string | null;
  status?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface EntityProfileRecord {
  name?: string | null;
}

interface ActorStateRecord {
  state?: unknown;
}

interface PlayerActorStateProfileRecord {
  profile?: {
    name?: string | null;
  } | null;
}

export async function handleListSessions(c: Context): Promise<Response> {
  const ownerEmail = getOwnerEmail(c);
  const sessions = (await listSessions(ownerEmail)) as SessionRecord[];

  const decorated = await Promise.all(
    sessions.map(async (sess) => {
      let characterName: string | undefined;
      let settingName: string | undefined;

      if (sess.playerCharacterId) {
        const char = (await getEntityProfile(toId(sess.playerCharacterId))) as
          | EntityProfileRecord
          | null;
        characterName = char?.name ?? undefined;
      } else {
        const actorState = (await getActorState(toId(sess.id), 'player')) as
          | ActorStateRecord
          | null;
        const playerState = actorState?.state as PlayerActorStateProfileRecord | undefined;
        characterName = playerState?.profile?.name ?? undefined;
      }
      if (sess.settingId) {
        const setting = (await getEntityProfile(toId(sess.settingId))) as
          | EntityProfileRecord
          | null;
        settingName = setting?.name ?? undefined;
      }

      return {
        id: sess.id,
        name: sess.name,
        playerCharacterId: sess.playerCharacterId,
        settingId: sess.settingId,
        characterName: characterName ?? 'Unknown Hero',
        settingName: settingName ?? 'Unknown World',
        status: sess.status,
        createdAt: sess.createdAt,
        updatedAt: sess.updatedAt,
      };
    })
  );

  return c.json(decorated, 200);
}

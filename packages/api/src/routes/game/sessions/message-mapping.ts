import type { SessionMessageDto, SpokePayload } from './types.js';
import { createLogger } from '@arcagentic/logger';
import { isUuid } from '../../../utils/uuid.js';

const log = createLogger('api', 'sessions');

export interface SpokeEventLike {
  actorId: string;
  payload?: unknown;
  timestamp?: unknown;
  sequence?: unknown;
}

export interface MessageMappingDeps {
  sessionId: string;
  getProfileName: (profileId: string) => Promise<string | null>;
  getActorDisplayName: (actorId: string) => Promise<string | null>;
}

function isPlayerActorId(actorId: string): boolean {
  return actorId === 'player' || actorId.startsWith('player:');
}

function normalizeCreatedAt(timestamp: unknown): string {
  const date = timestamp instanceof Date ? timestamp : new Date((timestamp as string | number | undefined) ?? Date.now());
  return date.toISOString();
}

function normalizeIdx(sequence: unknown): number {
  if (typeof sequence === 'bigint') return Number(sequence);
  if (typeof sequence === 'number') return sequence;
  if (typeof sequence === 'string') {
    const parsed = Number(sequence);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * Maps persisted SPOKE events to message DTOs.
 *
 * This function is defensive: it avoids querying entity_profiles with non-UUID ids
 * (e.g. legacy actor ids like "player:admin@example.com").
 */
export async function mapSpokeEventsToMessages(
  spokeEvents: SpokeEventLike[],
  deps: MessageMappingDeps
): Promise<SessionMessageDto[]> {
  const profileNameCache = new Map<string, Promise<string | null>>();
  const actorNameCache = new Map<string, Promise<string | null>>();

  /**
   * Load profile name with caching to avoid repeated DB calls.
   */
  const loadProfileName = async (profileId: string): Promise<string | null> => {
    const existing = profileNameCache.get(profileId);
    if (existing) return existing;

    const promise = deps.getProfileName(profileId).catch((err: unknown) => {
      log.warn({ err, sessionId: deps.sessionId, candidateProfileId: profileId }, 'failed to load speaker profile for session message');
      return null;
    });

    profileNameCache.set(profileId, promise);
    return promise;
  };

  /**
   * Load actor display name with caching to avoid repeated DB calls.
   */
  const loadActorName = async (actorId: string): Promise<string | null> => {
    const existing = actorNameCache.get(actorId);
    if (existing) return existing;

    const promise = deps.getActorDisplayName(actorId).catch((err: unknown) => {
      log.warn({ err, sessionId: deps.sessionId, actorId }, 'failed to load actor display name for session message');
      return null;
    });

    actorNameCache.set(actorId, promise);
    return promise;
  };

  return Promise.all(
    spokeEvents.map(async (event): Promise<SessionMessageDto> => {
      const payload = (event.payload ?? {}) as SpokePayload;
      const actorId = event.actorId;
      const isPlayer = isPlayerActorId(actorId);

      const createdAt = normalizeCreatedAt(event.timestamp);
      const idx = normalizeIdx(event.sequence);

      let speaker: SessionMessageDto['speaker'];
      if (!isPlayer) {
        const actorName = await loadActorName(actorId);
        if (actorName) {
          speaker = { id: actorId, name: actorName };
        }

        const rawProfileId = typeof payload.entityProfileId === 'string' ? payload.entityProfileId : null;
        const candidateProfileId =
          rawProfileId && isUuid(rawProfileId)
            ? rawProfileId
            : isUuid(actorId)
              ? actorId
              : null;

        if (!speaker && candidateProfileId) {
          const name = await loadProfileName(candidateProfileId);
          if (name) {
            speaker = { id: actorId, name };
          }
        }
      }

      return {
        role: isPlayer ? 'user' : 'assistant',
        content: typeof payload.content === 'string' ? payload.content : '',
        createdAt,
        idx,
        ...(speaker ? { speaker } : {}),
      };
    })
  );
}

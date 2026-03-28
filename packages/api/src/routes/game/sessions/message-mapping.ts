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
 * Try to extract structured NPC response fields from a JSON-encoded content string.
 * Returns null if content is not valid JSON with a dialogue field.
 */
function tryParseJsonContent(content: string): { dialogue: string; action?: string; emotion?: string } | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{')) return null;

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === 'object' && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      if (typeof obj['dialogue'] === 'string') {
        return {
          dialogue: obj['dialogue'],
          ...(typeof obj['action'] === 'string' && obj['action'].trim() ? { action: obj['action'].trim() } : {}),
          ...(typeof obj['emotion'] === 'string' && obj['emotion'].trim() ? { emotion: obj['emotion'].trim() } : {}),
        };
      }
    }
  } catch {
    // Not JSON.
  }
  return null;
}

/**
 * Format NPC message content using structured fields (action, emotion, dialogue).
 * Produces markdown-like formatting: *actions* in italics, "dialogue" in quotes.
 */
function formatNpcContent(content: string, action?: string, emotion?: string, speakerName?: string): string {
  let dialogue = content;
  let resolvedAction = action;
  let resolvedEmotion = emotion;

  const jsonParsed = tryParseJsonContent(content);
  if (jsonParsed) {
    dialogue = jsonParsed.dialogue;
    resolvedAction = jsonParsed.action ?? resolvedAction;
    resolvedEmotion = jsonParsed.emotion ?? resolvedEmotion;
  }

  const parts: string[] = [];
  const name = speakerName ?? 'They';

  if (resolvedAction && resolvedEmotion) {
    parts.push(`*${name} ${resolvedAction}, ${resolvedEmotion}.*`);
  } else if (resolvedAction) {
    parts.push(`*${name} ${resolvedAction}.*`);
  } else if (resolvedEmotion) {
    parts.push(`*${name} looks ${resolvedEmotion}.*`);
  }

  if (dialogue) {
    const trimmedDialogue = dialogue.trim();
    if (trimmedDialogue.startsWith('"') && trimmedDialogue.endsWith('"')) {
      parts.push(trimmedDialogue);
    } else {
      parts.push(`"${trimmedDialogue}"`);
    }
  }

  return parts.join('\n\n') || content;
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

      const rawContent = typeof payload.content === 'string' ? payload.content : '';

      const content = isPlayer
        ? rawContent
        : formatNpcContent(
            rawContent,
            typeof payload.action === 'string' ? payload.action : undefined,
            typeof payload.emotion === 'string' ? payload.emotion : undefined,
            speaker?.name
          );

      return {
        role: isPlayer ? 'user' : 'assistant',
        content,
        createdAt,
        idx,
        ...(speaker ? { speaker } : {}),
      };
    })
  );
}

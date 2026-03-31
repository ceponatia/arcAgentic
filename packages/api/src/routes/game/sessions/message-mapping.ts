import type { NarratorMessageRecordLike, SessionMessageDto, SpokePayload } from './types.js';
import { createLogger } from '@arcagentic/logger';
import { isUuid } from '../../../utils/uuid.js';

const log = createLogger('api', 'sessions');

export interface SpokeEventLike {
  id?: unknown;
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

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Try to extract structured NPC response fields from a JSON-encoded content string.
 * Returns null if content is not valid JSON with recognized speech fields.
 */
function tryParseJsonContent(content: string): {
  dialogue?: string;
  action?: string;
  physicalAction?: string;
  observation?: string;
  emotion?: string;
  sensoryDetail?: string;
} | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{')) return null;

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === 'object' && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      const dialogue = normalizeOptionalString(obj['dialogue']);
      const action = normalizeOptionalString(obj['action']);
      const physicalAction = normalizeOptionalString(obj['physicalAction']);
      const observation = normalizeOptionalString(obj['observation']);
      const emotion = normalizeOptionalString(obj['emotion']);
      const sensoryDetail = normalizeOptionalString(obj['sensoryDetail']);

      const structured = {
        ...(dialogue ? { dialogue } : {}),
        ...(action ? { action } : {}),
        ...(physicalAction ? { physicalAction } : {}),
        ...(observation ? { observation } : {}),
        ...(emotion ? { emotion } : {}),
        ...(sensoryDetail ? { sensoryDetail } : {}),
      };

      if (Object.values(structured).some((value) => value !== undefined)) {
        return structured;
      }
    }
  } catch {
    // Not JSON.
  }
  return null;
}

/**
 * Format NPC message content using structured fields.
 * Produces markdown-like formatting: *actions/details/emotion* in italics, "dialogue" in quotes.
 */
function formatNpcContent(
  content: string,
  action?: string,
  emotion?: string,
  physicalAction?: string,
  observation?: string,
  sensoryDetail?: string
): string {
  let dialogue = content;
  let resolvedAction = action;
  let resolvedEmotion = emotion;
  let resolvedPhysicalAction = physicalAction;
  let resolvedObservation = observation;
  let resolvedSensoryDetail = sensoryDetail;
  let usedStructuredContent = false;

  const jsonParsed = tryParseJsonContent(content);
  if (jsonParsed) {
    usedStructuredContent = true;
    dialogue = jsonParsed.dialogue ?? '';
    resolvedAction = jsonParsed.action ?? resolvedAction;
    resolvedEmotion = jsonParsed.emotion ?? resolvedEmotion;
    resolvedPhysicalAction = jsonParsed.physicalAction ?? resolvedPhysicalAction;
    resolvedObservation = jsonParsed.observation ?? resolvedObservation;
    resolvedSensoryDetail = jsonParsed.sensoryDetail ?? resolvedSensoryDetail;
  }

  const parts: string[] = [];
  const normalizedPhysicalAction = resolvedPhysicalAction ?? resolvedAction;

  if (normalizedPhysicalAction) {
    parts.push(`*${normalizedPhysicalAction}*`);
  }

  if (resolvedObservation) {
    parts.push(`*${resolvedObservation}*`);
  }

  if (resolvedSensoryDetail) {
    parts.push(`*${resolvedSensoryDetail}*`);
  }

  if (resolvedEmotion) {
    parts.push(`*${resolvedEmotion}*`);
  }

  if (dialogue) {
    const trimmedDialogue = dialogue.trim();
    if (trimmedDialogue.startsWith('"') && trimmedDialogue.endsWith('"')) {
      parts.push(trimmedDialogue);
    } else {
      parts.push(`"${trimmedDialogue}"`);
    }
  }

  return parts.join('\n\n') || (usedStructuredContent ? dialogue : content);
}

/**
 * Maps persisted SPOKE events to message DTOs.
 *
 * This function is defensive: it avoids querying entity_profiles with non-UUID ids
 * (e.g. legacy actor ids like "player:admin@example.com").
 */
export async function mapSpokeEventsToMessages(
  spokeEvents: SpokeEventLike[],
  deps: MessageMappingDeps,
  narratorMessages: NarratorMessageRecordLike[] = []
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

  const resolveSpeaker = async (
    actorId: string,
    payload?: SpokePayload
  ): Promise<SessionMessageDto['speaker'] | undefined> => {
    const actorName = await loadActorName(actorId);
    if (actorName) {
      return { id: actorId, name: actorName };
    }

    const rawProfileId = typeof payload?.entityProfileId === 'string' ? payload.entityProfileId : null;
    const candidateProfileId =
      rawProfileId && isUuid(rawProfileId)
        ? rawProfileId
        : isUuid(actorId)
          ? actorId
          : null;

    if (!candidateProfileId) {
      return undefined;
    }

    const name = await loadProfileName(candidateProfileId);
    return name ? { id: actorId, name } : undefined;
  };

  const normalizedNarratorMessages = narratorMessages
    .map((message) => ({
      idx: normalizeIdx(message.turnSequence),
      prose: message.prose,
      createdAt: normalizeCreatedAt(message.createdAt),
      contributingActorIds: normalizeStringArray(message.contributingActorIds),
      spokeEventIds: normalizeStringArray(message.spokeEventIds),
    }))
    .sort((left, right) => left.idx - right.idx || left.createdAt.localeCompare(right.createdAt));

  const narratorRanges = normalizedNarratorMessages.map((message, index) => ({
    ...message,
    nextIdx:
      index < normalizedNarratorMessages.length - 1
        ? normalizedNarratorMessages[index + 1]?.idx ?? Number.POSITIVE_INFINITY
        : Number.POSITIVE_INFINITY,
  }));

  const isCoveredByNarrator = (event: SpokeEventLike): boolean => {
    if (isPlayerActorId(event.actorId)) {
      return false;
    }

    const eventId = typeof event.id === 'string' ? event.id : null;
    const eventIdx = normalizeIdx(event.sequence);

    return narratorRanges.some((message) => {
      if (message.spokeEventIds.length > 0) {
        if (eventId) {
          return message.spokeEventIds.includes(eventId);
        }

        return (
          eventIdx >= message.idx &&
          eventIdx < message.nextIdx &&
          message.contributingActorIds.includes(event.actorId)
        );
      }

      return (
        eventIdx >= message.idx &&
        eventIdx < message.nextIdx &&
        message.contributingActorIds.includes(event.actorId)
      );
    });
  };

  const eventMessages = await Promise.all(
    spokeEvents
      .filter((event) => !isCoveredByNarrator(event))
      .map(async (event): Promise<SessionMessageDto> => {
        const payload = (event.payload ?? {}) as SpokePayload;
        const actorId = event.actorId;
        const isPlayer = isPlayerActorId(actorId);

        const createdAt = normalizeCreatedAt(event.timestamp);
        const idx = normalizeIdx(event.sequence);

        let speaker: SessionMessageDto['speaker'];
        if (!isPlayer) {
          speaker = await resolveSpeaker(actorId, payload);
        }

        const rawContent = typeof payload.content === 'string' ? payload.content : '';

        const content = isPlayer
          ? rawContent
          : formatNpcContent(
            rawContent,
            typeof payload.action === 'string' ? payload.action : undefined,
            typeof payload.emotion === 'string' ? payload.emotion : undefined,
            typeof payload.physicalAction === 'string' ? payload.physicalAction : undefined,
            typeof payload.observation === 'string' ? payload.observation : undefined,
            typeof payload.sensoryDetail === 'string' ? payload.sensoryDetail : undefined
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

  const narratorDtos = await Promise.all(
    normalizedNarratorMessages.map(async (message): Promise<SessionMessageDto> => {
      let speaker: SessionMessageDto['speaker'];

      if (message.contributingActorIds.length === 1) {
        const actorId = message.contributingActorIds[0];
        if (actorId) {
          const resolvedSpeaker = await resolveSpeaker(actorId);
          speaker = resolvedSpeaker ?? { id: actorId, name: actorId };
        }
      }

      return {
        role: 'assistant',
        content: message.prose,
        createdAt: message.createdAt,
        idx: message.idx,
        ...(speaker ? { speaker } : {}),
      };
    })
  );

  return [...eventMessages, ...narratorDtos].sort(
    (left, right) => left.idx - right.idx || left.createdAt.localeCompare(right.createdAt)
  );
}

import { getEventsForSession, saveEvent } from '@arcagentic/db/node';
import { createLogger } from '@arcagentic/logger';
import { isRecord, type WorldEvent } from '@arcagentic/schemas';
import { toSessionId } from '../utils/uuid.js';

const log = createLogger('api', 'events');

/**
 * Persist a world event to the database using a session-scoped sequence number.
 * Session-less system events are ignored.
 */
export async function persistWorldEvent(event: WorldEvent): Promise<void> {
  const sessionId = extractSessionId(event);
  if (!sessionId) return;

  if (!sessionSequenceCache.has(sessionId)) {
    await recoverSessionSequence(sessionId);
  }

  const sequence = nextSequence(sessionId);
  const payload = extractPayload(event);
  const actorId = 'actorId' in event ? extractString(event.actorId) : null;
  const causedByEventId = 'causedByEventId' in event ? extractString(event.causedByEventId) : null;

  try {
    await saveEvent({
      sessionId: toSessionId(sessionId),
      sequence,
      type: event.type,
      payload,
      actorId,
      causedByEventId,
    });
  } catch (error) {
    log.error({ err: error, sessionId, eventType: event.type, sequence: sequence.toString() }, 'failed to persist world event');
  }
}

/**
 * Seed the in-memory sequence cache from historical events.
 */
export function primeSessionSequence(sessionId: string, events: SequenceBearing[]): void {
  const lastSequence = findLastSequence(events);
  const nextSeq = (lastSequence ?? -1n) + 1n;
  sessionSequenceCache.set(sessionId, nextSeq);
}

/**
 * Recover the next sequence for a session by scanning persisted events.
 */
export async function recoverSessionSequence(sessionId: string): Promise<void> {
  try {
    const events = await getEventsForSession(toSessionId(sessionId));
    primeSessionSequence(sessionId, events);
  } catch (error) {
    log.error({ err: error, sessionId }, 'failed to recover session sequence');
  }
}

const sessionSequenceCache = new Map<string, bigint>();

interface SequenceBearing {
  sequence?: unknown;
}

function extractSessionId(event: WorldEvent): string | undefined {
  const eventSessionId = 'sessionId' in event ? event.sessionId : undefined;
  if (typeof eventSessionId === 'string' && eventSessionId.length > 0) {
    return eventSessionId;
  }

  const payload = 'payload' in event ? event.payload : undefined;
  if (isRecord(payload)) {
    const payloadSessionId = payload['sessionId'];
    if (typeof payloadSessionId === 'string' && payloadSessionId.length > 0) {
      return payloadSessionId;
    }
  }

  return undefined;
}

function extractPayload(event: WorldEvent): Record<string, unknown> | unknown[] {
  const rawPayload = 'payload' in event ? event.payload : undefined;
  if (isRecord(rawPayload) || Array.isArray(rawPayload)) {
    return rawPayload;
  }
  return { ...event };
}

function extractString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function nextSequence(sessionId: string): bigint {
  const current = sessionSequenceCache.get(sessionId) ?? 0n;
  sessionSequenceCache.set(sessionId, current + 1n);
  return current;
}

function findLastSequence(events: SequenceBearing[]): bigint | null {
  let last: bigint | null = null;
  for (const event of events) {
    const coerced = coerceSequence(event.sequence);
    if (coerced !== null && (last === null || coerced > last)) {
      last = coerced;
    }
  }
  return last;
}

function coerceSequence(value: unknown): bigint | null {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(value);
  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      return BigInt(value);
    } catch {
      return null;
    }
  }
  return null;
}

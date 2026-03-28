import { eq, and, gte, asc, desc } from 'drizzle-orm';
import { drizzle } from '../connection/drizzle.js';
import { events } from '../schema/index.js';
import type { UUID } from '../types.js';

export interface SaveEventInput {
  sessionId: UUID;
  sequence: bigint;
  type: string;
  payload: Record<string, unknown> | unknown[];
  actorId?: string | null;
  causedByEventId?: UUID | null;
}

export async function saveEvent(input: SaveEventInput) {
  const [result] = await drizzle
    .insert(events)
    .values({
      sessionId: input.sessionId,
      sequence: input.sequence,
      type: input.type,
      payload: input.payload,
      actorId: input.actorId,
      causedByEventId: input.causedByEventId,
    })
    .returning();
  return result;
}

export async function getEventsForSession(sessionId: UUID, fromSequence = 0n) {
  return await drizzle
    .select()
    .from(events)
    .where(and(eq(events.sessionId, sessionId), gte(events.sequence, fromSequence)))
    .orderBy(asc(events.sequence));
}

/**
 * Fetch the most recent SPOKE events for a session, ordered newest-first.
 * Callers should reverse the result if ascending order is needed.
 */
export async function getRecentSpokeEvents(sessionId: UUID, limit = 6) {
  return await drizzle
    .select()
    .from(events)
    .where(and(eq(events.sessionId, sessionId), eq(events.type, 'SPOKE')))
    .orderBy(desc(events.sequence))
    .limit(limit);
}

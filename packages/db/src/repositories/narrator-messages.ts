import { and, asc, desc, eq, isNull, or } from 'drizzle-orm';
import { drizzle as db } from '../connection/index.js';
import { narratorMessages } from '../schema/index.js';
import type { UUID } from '../types.js';

export interface InsertNarratorMessageInput {
  sessionId: UUID;
  turnSequence: bigint;
  prose: string;
  source: 'llm' | 'fallback' | 'direct';
  locationId?: string;
  contributingActorIds: string[];
  spokeEventIds: string[];
}

export type NarratorMessageRecord = typeof narratorMessages.$inferSelect;

/**
 * Insert a narrator-composed message and return the persisted row.
 */
export async function insertNarratorMessage(
  input: InsertNarratorMessageInput
): Promise<NarratorMessageRecord> {
  const [row] = await db
    .insert(narratorMessages)
    .values({
      sessionId: input.sessionId,
      turnSequence: input.turnSequence,
      prose: input.prose,
      source: input.source,
      ...(input.locationId ? { locationId: input.locationId } : {}),
      contributingActorIds: input.contributingActorIds,
      spokeEventIds: input.spokeEventIds,
    })
    .returning();

  if (!row) {
    throw new Error('Failed to insert narrator message.');
  }

  return row;
}

/**
 * List narrator-composed messages for a session in turn order.
 */
export async function listNarratorMessagesBySession(
  sessionId: UUID
): Promise<NarratorMessageRecord[]> {
  return await db
    .select()
    .from(narratorMessages)
    .where(eq(narratorMessages.sessionId, sessionId))
    .orderBy(asc(narratorMessages.turnSequence), asc(narratorMessages.createdAt));
}

/**
 * List recent narrator-composed messages for a location in ascending turn order.
 */
export async function listRecentNarratorMessagesByLocation(
  sessionId: UUID,
  locationId: string,
  limit = 5
): Promise<NarratorMessageRecord[]> {
  const rows = await db
    .select()
    .from(narratorMessages)
    .where(
      and(
        eq(narratorMessages.sessionId, sessionId),
        or(eq(narratorMessages.locationId, locationId), isNull(narratorMessages.locationId))
      )
    )
    .orderBy(desc(narratorMessages.turnSequence), desc(narratorMessages.createdAt))
    .limit(limit);

  return [...rows].reverse();
}

/**
 * List recent narrator-composed messages for a session in ascending turn order.
 */
export async function listRecentNarratorMessages(
  sessionId: UUID,
  limit = 5
): Promise<NarratorMessageRecord[]> {
  const rows = await db
    .select()
    .from(narratorMessages)
    .where(eq(narratorMessages.sessionId, sessionId))
    .orderBy(desc(narratorMessages.turnSequence), desc(narratorMessages.createdAt))
    .limit(limit);

  return [...rows].reverse();
}

/**
 * Delete a narrator-composed message for a specific session turn and return the deleted row.
 */
export async function deleteNarratorMessage(
  sessionId: UUID,
  turnSequence: bigint
): Promise<NarratorMessageRecord | null> {
  const [row] = await db
    .delete(narratorMessages)
    .where(
      and(
        eq(narratorMessages.sessionId, sessionId),
        eq(narratorMessages.turnSequence, turnSequence)
      )
    )
    .returning();

  return row ?? null;
}

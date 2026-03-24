import { drizzle as db } from '../connection/index.js';
import type { UUID } from '../types.js';
import { extractLocationId, InventoryStateSchema, SessionTimeStateSchema } from '@arcagentic/schemas';
import type { GameTime, InventoryItem } from '@arcagentic/schemas';
import { listActorStatesForSession } from './actor-states.js';
import type { ActorsAtLocationResult } from './types.js';

/**
 * List actors at a specific location based on actor state records.
 */
export async function getActorsAtLocation(
  sessionId: UUID,
  locationId: string
): Promise<ActorsAtLocationResult[]> {
  const actors = await listActorStatesForSession(sessionId);
  return actors
    .filter((actor) => extractLocationId(actor.state) === locationId)
    .map((actor) => ({ actorId: actor.actorId }));
}

/**
 * Get inventory items for a session's actor.
 */
export async function getInventoryItems(
  sessionId: UUID,
  _actorId: string
): Promise<InventoryItem[]> {
  void _actorId;
  const row = await db.query.sessionProjections.findFirst({
    where: (projection, { eq }) => eq(projection.sessionId, sessionId),
  });

  if (!row) return [];

  const parsed = InventoryStateSchema.safeParse(row.inventory);
  if (!parsed.success) return [];

  return parsed.data.items;
}

/**
 * Get a specific inventory item by ID.
 */
export async function getInventoryItem(
  sessionId: UUID,
  actorId: string,
  itemId: string
): Promise<InventoryItem | null> {
  const items = await getInventoryItems(sessionId, actorId);
  return items.find((item) => item.id === itemId) ?? null;
}

/**
 * Get the current session game time.
 */
export async function getSessionGameTime(sessionId: UUID): Promise<GameTime | null> {
  const row = await db.query.sessionProjections.findFirst({
    where: (projection, { eq }) => eq(projection.sessionId, sessionId),
  });

  if (!row) return null;

  const parsed = SessionTimeStateSchema.safeParse(row.time);
  if (!parsed.success) return null;

  return parsed.data.current;
}

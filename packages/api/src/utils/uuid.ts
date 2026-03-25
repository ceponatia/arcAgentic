import { randomUUID } from 'node:crypto';

/**
 * UUID Coercion Utilities
 *
 * The /db package uses branded UUID types for type safety.
 * These helpers provide semantic coercion from plain strings to branded types.
 *
 * Usage:
 *   Instead of: getActorState(sessionId as any, actorId)
 *   Use:        getActorState(toSessionId(sessionId), actorId)
 *
 * Note: These utilities are re-exported from /utils where available.
 */

export { isUuid, toSessionId, toEntityProfileId, toId, toIds } from '@arcagentic/utils';

export function generateId(): string {
  return randomUUID();
}

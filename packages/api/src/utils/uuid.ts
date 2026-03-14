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
 * Note: These utilities are now re-exported from /utils for better sharing.
 */

export { isUuid, toSessionId, toEntityProfileId, toId, toIds } from '@arcagentic/utils';

import type { WorldEvent } from '@arcagentic/schemas';
import type { PerceptionContext, NpcRuntimeState } from './types.js';
import { getStringField, getWorldEventPayload } from './event-access.js';

/**
 * Perception layer - filters and processes events for an NPC.
 */
export class PerceptionLayer {
  /**
   * Filter events relevant to this NPC.
   */
  static filterRelevantEvents(events: WorldEvent[], state: NpcRuntimeState): WorldEvent[] {
    return events.filter((event) => this.isRelevant(event, state));
  }

  /**
   * Check if an event is relevant to this NPC.
   */
  static isRelevant(event: WorldEvent, state: NpcRuntimeState): boolean {
    const payload = getWorldEventPayload(event);

    // Session filter
    const eventSessionId =
      getStringField(event, 'sessionId') ?? getStringField(payload, 'sessionId');
    if (eventSessionId && eventSessionId !== state.sessionId) {
      return false;
    }

    // Location-based relevance
    const locationCandidates = [
      getStringField(event, 'locationId'),
      getStringField(event, 'toLocationId'),
      getStringField(event, 'fromLocationId'),
      getStringField(payload, 'locationId'),
      getStringField(payload, 'toLocationId'),
      getStringField(payload, 'fromLocationId'),
    ].filter((value): value is string => value !== undefined);

    const uniqueLocationIds = Array.from(new Set(locationCandidates));
    const hasLocation = uniqueLocationIds.length > 0;
    const isInNpcLocation = uniqueLocationIds.includes(state.locationId);

    if (hasLocation && !isInNpcLocation) {
      // Event is in a different location - not relevant unless it's a TICK or session-level event
      if (event.type !== 'TICK' && !event.type.includes('SESSION')) {
        return false;
      }
    }

    // Actor-specific events
    const targetActorId =
      getStringField(event, 'targetActorId') ?? getStringField(payload, 'targetActorId');
    if (targetActorId && targetActorId !== state.id) {
      return false;
    }

    return true;
  }

  /**
   * Build perception context from recent events.
   */
  static buildContext(events: WorldEvent[], state: NpcRuntimeState): PerceptionContext {
    const relevantEvents = this.filterRelevantEvents(events, state);

    // Extract nearby actors from MOVED events
    const nearbyActors = new Set<string>();
    for (const event of relevantEvents) {
      if (event.type === 'MOVED') {
        const actorId = getStringField(event, 'actorId');
        const toLocationId = getStringField(event, 'toLocationId');

        if (actorId && toLocationId === state.locationId) {
          nearbyActors.add(actorId);
        }
      }
    }

    return {
      relevantEvents,
      nearbyActors: Array.from(nearbyActors),
    };
  }

  /**
   * Summarize perception for logging/debugging.
   */
  static summarize(context: PerceptionContext): string {
    const eventTypes = context.relevantEvents.map((e) => e.type).join(', ');
    return `Perceived ${context.relevantEvents.length} events: ${eventTypes}. Nearby: ${context.nearbyActors.length} actors.`;
  }
}

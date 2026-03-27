import type { WorldEvent } from '@arcagentic/schemas';
import type {
  EventPromotionRule,
  PerceptionConfig,
  PerceptionContext,
  NpcRuntimeState,
} from './types.js';
import { getStringField, getWorldEventPayload } from './event-access.js';

export const DEFAULT_PROMOTION_RULES: EventPromotionRule[] = [
  { eventType: 'SPOKE', priority: 'high', requiresProximity: true },
  { eventType: 'DAMAGED', priority: 'high', requiresProximity: true },
  { eventType: 'DIED', priority: 'high', requiresProximity: true },
  { eventType: 'MOVED', priority: 'medium', requiresProximity: true },
  { eventType: 'ITEM_ACQUIRED', priority: 'medium', requiresProximity: true },
  { eventType: 'ITEM_DROPPED', priority: 'medium', requiresProximity: true },
  { eventType: 'NPC_ACTIVITY_CHANGED', priority: 'medium', requiresProximity: true },
  { eventType: 'TICK', priority: 'low', requiresProximity: false, cooldownMs: 10000 },
  { eventType: 'ACTOR_SPAWN', priority: 'low', requiresProximity: true, cooldownMs: 5000 },
  { eventType: 'ACTOR_DESPAWN', priority: 'low', requiresProximity: true, cooldownMs: 5000 },
];

export const DEFAULT_PERCEPTION_CONFIG: PerceptionConfig = {
  promotionRules: DEFAULT_PROMOTION_RULES,
  batchSize: 5,
  batchTimeoutMs: 2000,
};

/**
 * Manages event promotion decisions, cooldown tracking, and batch accumulation.
 */
export class EventPromoter {
  private readonly config: PerceptionConfig;
  private readonly ruleMap: Map<WorldEvent['type'], EventPromotionRule>;
  private readonly cooldowns: Map<WorldEvent['type'], number> = new Map<
    WorldEvent['type'],
    number
  >();
  private batch: WorldEvent[] = [];
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onFlush: (events: WorldEvent[]) => void;

  constructor(config: PerceptionConfig, onFlush: (events: WorldEvent[]) => void) {
    this.config = config;
    this.onFlush = onFlush;
    this.ruleMap = new Map<WorldEvent['type'], EventPromotionRule>(
      config.promotionRules.map((rule) => [rule.eventType, rule])
    );
  }

  /**
   * Evaluate whether an event should be promoted.
   * Returns 'immediate' for high-priority, 'batched' for medium/low, or 'drop' for filtered events.
   */
  evaluate(event: WorldEvent): 'immediate' | 'batched' | 'drop' {
    const rule = this.ruleMap.get(event.type);
    if (!rule) {
      return 'drop';
    }

    const now = Date.now();

    if (rule.cooldownMs) {
      const lastPromoted = this.cooldowns.get(event.type);
      if (lastPromoted !== undefined && now - lastPromoted < rule.cooldownMs) {
        return 'drop';
      }
    }

    if (rule.cooldownMs) {
      this.cooldowns.set(event.type, now);
    }

    if (rule.priority === 'high') {
      return 'immediate';
    }

    return 'batched';
  }

  /**
   * Submit an event for promotion. High-priority events flush any pending batch immediately.
   * Medium/low events accumulate in the batch.
   */
  submit(event: WorldEvent): WorldEvent[] | null {
    const decision = this.evaluate(event);

    if (decision === 'drop') {
      return null;
    }

    if (decision === 'immediate') {
      const flushed = this.flushBatch();
      flushed.push(event);
      return flushed;
    }

    this.batch.push(event);

    if (this.batch.length >= this.config.batchSize) {
      return this.flushBatch();
    }

    this.batchTimer ??= setTimeout((): void => {
      const flushed = this.flushBatch();
      if (flushed.length > 0) {
        this.onFlush(flushed);
      }
    }, this.config.batchTimeoutMs);

    return null;
  }

  /** Flush pending batch and return accumulated events. */
  flushBatch(): WorldEvent[] {
    const events = this.batch;
    this.batch = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    return events;
  }

  /** Reset all state (cooldowns, batch, timers). */
  reset(): void {
    this.cooldowns.clear();
    this.batch = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /** Check if an event type has a promotion rule. */
  hasRule(eventType: WorldEvent['type']): boolean {
    return this.ruleMap.has(eventType);
  }
}

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

    const eventActorId =
      getStringField(event, 'actorId') ?? getStringField(payload, 'actorId');
    if (event.type === 'SPOKE' && eventActorId === state.id) {
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

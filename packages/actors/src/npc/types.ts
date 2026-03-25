import type { NpcLocationState, WorldEvent } from '@arcagentic/schemas';
import type { BaseActorState } from '../base/types.js';
import type { LLMProvider } from '@arcagentic/llm';
import type { CharacterProfile } from '@arcagentic/schemas';

/**
 * NPC-specific state extensions.
 */
export interface NpcRuntimeState extends BaseActorState {
  type: 'npc';
  /** NPC persona/character ID */
  npcId: string;
  /** Short-term event memory */
  recentEvents: WorldEvent[];
  /** Current goals or objectives */
  goals: string[];
  /** Emotional state or mood */
  mood?: string;
}

/** Priority level for event promotion. */
export type EventPriority = 'high' | 'medium' | 'low';

/** Configurable rule for promoting world events into the NPC cognition loop. */
export interface EventPromotionRule {
  /** Event type to match */
  eventType: WorldEvent['type'];
  /** Priority level: high events promote immediately, medium/low may be batched */
  priority: EventPriority;
  /** Whether the NPC must be in the same location as the event source */
  requiresProximity: boolean;
  /** Optional cooldown in milliseconds to prevent repeated promotions of the same event type */
  cooldownMs?: number;
}

/** Configuration for the NPC perception layer. */
export interface PerceptionConfig {
  /** Rules controlling which events are promoted into the cognition loop */
  promotionRules: EventPromotionRule[];
  /** Maximum number of medium/low events to batch before forcing a cognition cycle */
  batchSize: number;
  /** Maximum time in ms to wait before flushing a batch of medium/low events */
  batchTimeoutMs: number;
}

/**
 * Perception context - what the NPC is currently aware of.
 */
export interface PerceptionContext {
  /** Events relevant to this NPC */
  relevantEvents: WorldEvent[];
  /** Nearby actors/entities */
  nearbyActors: string[];
  /** Current location state */
  locationState?: NpcLocationState | undefined;
}

/**
 * Cognition context - decision-making inputs.
 */
export interface CognitionContext {
  /** What the NPC perceived */
  perception: PerceptionContext;
  /** NPC's current state */
  state: NpcRuntimeState;
  /** Available actions */
  availableActions: string[];
}

/**
 * Action result - intent to emit.
 */
export interface ActionResult {
  /** Intent event to emit */
  intent: WorldEvent;
  /** Optional delay before emitting */
  delayMs?: number;
}

/**
 * NPC machine context (XState).
 */
export interface NpcMachineContext {
  actorId: string;
  npcId: string;
  sessionId: string;
  locationId: string;
  recentEvents: WorldEvent[];
  perceptionConfig?: PerceptionConfig;
  perception?: PerceptionContext;
  cognition?: CognitionContext;
  pendingIntent?: WorldEvent;
  profile?: CharacterProfile;
  llmProvider?: LLMProvider;
}

/**
 * NPC machine events (XState).
 */
export type NpcMachineEvent =
  | { type: 'WORLD_EVENT'; event: WorldEvent }
  | { type: 'PERCEIVE' }
  | { type: 'THINK' }
  | { type: 'ACT' }
  | { type: 'WAIT'; until: Date }
  | { type: 'RESUME' };

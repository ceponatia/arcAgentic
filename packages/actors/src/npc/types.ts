import type {
  CharacterProfile,
  EpisodicMemorySummary,
  NpcLocationState,
  ToolCall,
  ToolDefinition,
  WorldEvent,
} from '@arcagentic/schemas';
import type { BaseActorState } from '../base/types.js';
import type { LLMMessage, LLMProvider } from '@arcagentic/llm';

export type { EpisodicMemorySummary } from '@arcagentic/schemas';

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

export interface NpcRelationshipAffinity {
  trust: number;
  fondness: number;
  fear: number;
}

export interface NpcRelationshipContext {
  relationshipType: string;
  affinity: NpcRelationshipAffinity;
}

export interface NpcMemoryProvider {
  getEpisodicMemories(input: {
    sessionId: string;
    actorId: string;
    recentContext: string;
  }): Promise<EpisodicMemorySummary[]>;
}

export interface CognitionContextExtras {
  /** Relationship context for this NPC keyed by target actor ID */
  relationships?: Record<string, NpcRelationshipContext>;
  /** Player character's name so NPC can address them */
  playerName?: string;
  /** Brief description of the player character */
  playerDescription?: string;
  /** Appeal tags active for the current player persona */
  playerAppealTags?: string[];
  /** The setting's starting scenario / initial scene description */
  startingScenario?: string;
  /** NPC's current location name/description */
  locationName?: string;
  locationDescription?: string;
  /** NPC's current activity */
  currentActivity?: {
    type: string;
    description: string;
    engagement: string;
    target?: string;
  };
  /** Proximity to the player */
  playerProximity?: string;
  /** Whether this NPC is interruptible */
  interruptible?: boolean;
  /** Whether the player is speaking directly to this NPC in the current turn */
  playerAddressedDirectly?: boolean;
  /** Other NPCs nearby with what they're doing */
  nearbyNpcSummaries?: string[];
  /** Actor IDs currently present in the nearby scene */
  nearbyActorIds?: string[];
  /** Optional episodic memory lookup provider for richer LLM cognition */
  memoryProvider?: NpcMemoryProvider;
}

/** How a player event relates to this specific NPC. */
export type EventAddressType = 'direct' | 'overheard' | 'ambient' | 'not-perceived';

/** Enriched event with address classification for engagement gating. */
export interface ClassifiedEvent {
  event: WorldEvent;
  addressType: EventAddressType;
}

/** Result of engagement evaluation before invoking LLM cognition. */
export interface EngagementDecision {
  shouldAct: boolean;
  reason: string;
  /** If not acting, provide a brief activity continuation description. */
  continuationHint?: string;
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
  /** Bounded recent narrator prose for scene continuity */
  narratorHistory?: string[];
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
export interface NpcMachineContext extends CognitionContextExtras {
  actorId: string;
  npcId: string;
  sessionId: string;
  locationId: string;
  recentEvents: WorldEvent[];
  narratorHistory?: string[];
  perceptionConfig?: PerceptionConfig;
  perception?: PerceptionContext;
  cognition?: CognitionContext;
  pendingIntent?: WorldEvent;
  engagementDecision?: EngagementDecision;
  profile?: CharacterProfile;
  llmProvider?: LLMProvider;
}

/** Options for LLM-backed cognition. */
export interface CognitionLLMOptions {
  /** Tool definitions to pass to the LLM. */
  tools?: ToolDefinition[];
}

/** Discriminated union for decideLLM results. */
export type CognitionLLMResult =
  | { type: 'action'; result: ActionResult | null }
  | { type: 'tool_calls'; calls: ToolCall[]; messages: LLMMessage[] };

/**
 * NPC machine events (XState).
 */
export type NpcMachineEvent =
  | { type: 'WORLD_EVENT'; event: WorldEvent }
  | { type: 'SET_NARRATOR_HISTORY'; narratorHistory: string[] | undefined }
  | { type: 'SET_CONTEXT_EXTRAS'; contextExtras: Partial<CognitionContextExtras> }
  | { type: 'PERCEIVE' }
  | { type: 'THINK' }
  | { type: 'ACT' }
  | { type: 'WAIT'; until: Date }
  | { type: 'RESUME' };

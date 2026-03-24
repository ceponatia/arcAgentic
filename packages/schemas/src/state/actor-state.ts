import { z } from 'zod';
import { CharacterProfileSchema } from '../character/index.js';
import { PlayerInterestScoreSchema } from '../npc-tier/index.js';
import { NpcScheduleSchema } from '../schedule/index.js';
import { GameTimeSchema } from '../time/index.js';
import { isRecord } from '../shared/is-record.js';
import { NpcLocationStateSchema } from './npc-location.js';

export const ActorStatusSchema = z.enum(['active', 'inactive']);
export type ActorStatus = z.infer<typeof ActorStatusSchema>;

export const NpcActorRoleSchema = z.enum(['primary', 'supporting', 'background', 'antagonist']);
export type NpcActorRole = z.infer<typeof NpcActorRoleSchema>;

export const NpcActorTierSchema = z.enum(['major', 'minor', 'transient', 'background']);
export type NpcActorTier = z.infer<typeof NpcActorTierSchema>;

export const ActorLocationSchema = z.object({
  currentLocationId: z.string().min(1),
});
export type ActorLocation = z.infer<typeof ActorLocationSchema>;

export const ActorAffinityScoresSchema = z.object({
  trust: z.number(),
  fondness: z.number(),
  fear: z.number(),
});
export type ActorAffinityScores = z.infer<typeof ActorAffinityScoresSchema>;

/**
 * Affinity record stored per-actor relationship.
 */
export const AffinityRecordSchema = z.object({
  relationshipType: z.string().min(1),
  affinity: ActorAffinityScoresSchema,
  createdAt: z.string().min(1),
});
export type AffinityRecord = z.infer<typeof AffinityRecordSchema>;

export const NpcActorScheduleStateSchema = z.object({
  templateId: z.string().min(1).optional(),
  scheduleData: NpcScheduleSchema.optional(),
  placeholderMappings: z.record(z.string(), z.string()).optional(),
});
export type NpcActorScheduleState = z.infer<typeof NpcActorScheduleStateSchema>;

export const NpcActorSimulationStateSchema = z.object({
  currentState: NpcLocationStateSchema.optional(),
  lastComputedAt: GameTimeSchema.optional(),
  dayDecisions: z.record(z.string(), z.unknown()).optional(),
});
export type NpcActorSimulationState = z.infer<typeof NpcActorSimulationStateSchema>;

/**
 * NPC actor state shape stored in actor_states.state when actorType === 'npc'.
 */
export const NpcActorStateSchema = z.object({
  /** Role in the session */
  role: NpcActorRoleSchema,
  /** NPC tier for detail level */
  tier: NpcActorTierSchema,
  /** Display name */
  name: z.string().min(1),
  /** Optional label for identifying this NPC instance */
  label: z.string().min(1).nullable().optional(),
  /** Serialized character profile (legacy, for display) */
  profileJson: z.string().optional(),
  /** Current location state */
  location: ActorLocationSchema.optional(),
  /** NPC schedule data */
  schedule: NpcActorScheduleStateSchema.optional(),
  /** Player interest score for this NPC */
  interest: PlayerInterestScoreSchema.optional(),
  /** Last known location state */
  locationState: NpcLocationStateSchema.optional(),
  /** Simulation state */
  simulation: NpcActorSimulationStateSchema.optional(),
  /** Affinity toward other actors */
  affinity: z.record(z.string(), AffinityRecordSchema).optional(),
  /** Actor status */
  status: ActorStatusSchema,
});
export type NpcActorState = z.infer<typeof NpcActorStateSchema>;

const LooseProfileSchema = z.record(z.string(), z.unknown());

/**
 * Player actor state shape stored in actor_states.state when actorType === 'player'.
 */
export const PlayerActorStateSchema = z.object({
  /** Player profile data */
  profile: z.union([CharacterProfileSchema, LooseProfileSchema]),
  /** Actor status */
  status: ActorStatusSchema,
});
export type PlayerActorState = z.infer<typeof PlayerActorStateSchema>;

/**
 * Union type for all actor states.
 */
export const ActorStateSchema = z.union([NpcActorStateSchema, PlayerActorStateSchema]);
export type ActorState = z.infer<typeof ActorStateSchema>;

const TopLevelLocationIdSchema = z.object({
  locationId: z.string().min(1),
});

/**
 * Extract a location id from actor or session state without unsafe casts.
 */
export function extractLocationId(state: unknown): string | null {
  if (!isRecord(state)) {
    return null;
  }

  const location = ActorLocationSchema.safeParse(state['location']);
  if (location.success) {
    return location.data.currentLocationId;
  }

  const locationState = TopLevelLocationIdSchema.safeParse(state['locationState']);
  if (locationState.success) {
    return locationState.data.locationId;
  }

  const simulation = state['simulation'];
  if (isRecord(simulation)) {
    const currentState = TopLevelLocationIdSchema.safeParse(simulation['currentState']);
    if (currentState.success) {
      return currentState.data.locationId;
    }
  }

  const topLevelLocation = TopLevelLocationIdSchema.safeParse(state);
  if (topLevelLocation.success) {
    return topLevelLocation.data.locationId;
  }

  const currentLocationId = state['currentLocationId'];

  return typeof currentLocationId === 'string' && currentLocationId.length > 0
    ? currentLocationId
    : null;
}

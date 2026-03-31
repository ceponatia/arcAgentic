import { z } from 'zod';

/** Structured output from an NPC's cognition for narrator composition. */
export const NpcAgentIntentSchema = z.object({
  actorId: z.string(),
  name: z.string(),
  dialogue: z.string().optional(),
  action: z.string().optional(),
  physicalAction: z.string().optional(),
  observation: z.string().optional(),
  internalState: z.string().optional(),
  sensoryDetail: z.string().optional(),
  emotion: z.string().optional(),
  targetActorId: z.string().optional(),
  /** When true, this intent represents the NPC continuing its current activity rather than responding. */
  isContinuation: z.boolean().optional(),
  /** Description of the ongoing activity the NPC is continuing. */
  continuationActivity: z.string().optional(),
});

export const NpcNarrationIntentSchema = NpcAgentIntentSchema;

export type NpcAgentIntent = z.infer<typeof NpcAgentIntentSchema>;

export type NpcNarrationIntent = z.infer<typeof NpcNarrationIntentSchema>;

export const NpcCharacterSummarySchema = z.object({
  actorId: z.string(),
  name: z.string(),
  /** Brief speech style description (e.g., "formal and measured", "casual and slangy") */
  speechStyle: z.string().optional(),
  /** Emotional baseline (e.g., "calm and reserved", "anxious and fidgety") */
  emotionalBaseline: z.string().optional(),
  /** Physical mannerisms or visible cues that help render the character */
  physicalMannerisms: z.string().optional(),
  /** Current proximity to the player */
  proximityToPlayer: z.string().optional(),
});

export type NpcCharacterSummary = z.infer<typeof NpcCharacterSummarySchema>;

/** Scene context provided to the narrator for composing prose. */
export const NarratorContextSchema = z.object({
  locationName: z.string(),
  sceneDescription: z.string().optional(),
  presentActors: z.array(z.string()),
  recentHistory: z.array(z.string()),
  playerName: z.string().optional(),
  playerDescription: z.string().optional(),
  playerMessage: z.string().optional(),
  sceneEvents: z.array(z.string()).optional(),
  /** Per-NPC personality summaries for character-aware narration */
  characterSummaries: z.array(NpcCharacterSummarySchema).optional(),
  /** Scene-level proximity context (e.g., "close quarters", "intimate") */
  sceneProximity: z.string().optional(),
});

export type NarratorContext = z.infer<typeof NarratorContextSchema>;

export const NarrationSourceSchema = z.enum(['llm', 'fallback', 'direct']);

export type NarrationSource = z.infer<typeof NarrationSourceSchema>;

/** Metadata about a turn's narration for debugging and UI evolution. */
export const TurnNarrationMetadataSchema = z.object({
  source: NarrationSourceSchema,
  contributingActorIds: z.array(z.string()),
  intents: z.array(NpcAgentIntentSchema),
});

export type TurnNarrationMetadata = z.infer<typeof TurnNarrationMetadataSchema>;

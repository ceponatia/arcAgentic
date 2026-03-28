import { z } from 'zod';

/** Structured output from an NPC's cognition for narrator composition. */
export const NpcNarrationIntentSchema = z.object({
  actorId: z.string(),
  name: z.string(),
  dialogue: z.string(),
  action: z.string().optional(),
  emotion: z.string().optional(),
  targetActorId: z.string().optional(),
});

export type NpcNarrationIntent = z.infer<typeof NpcNarrationIntentSchema>;

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
});

export type NarratorContext = z.infer<typeof NarratorContextSchema>;

export const NarrationSourceSchema = z.enum(['llm', 'fallback', 'direct']);

export type NarrationSource = z.infer<typeof NarrationSourceSchema>;

/** Metadata about a turn's narration for debugging and UI evolution. */
export const TurnNarrationMetadataSchema = z.object({
  source: NarrationSourceSchema,
  contributingActorIds: z.array(z.string()),
  intents: z.array(NpcNarrationIntentSchema),
});

export type TurnNarrationMetadata = z.infer<typeof TurnNarrationMetadataSchema>;

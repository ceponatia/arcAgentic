import type { LLMProvider } from '@arcagentic/llm';

/** Structured output from an NPC's cognition decision. */
export interface NpcIntent {
  /** The actor ID of the NPC. */
  actorId: string;
  /** The NPC's display name. */
  name: string;
  /** What the NPC says (dialogue). May be empty if the NPC acts silently. */
  dialogue: string;
  /** A brief physical action or gesture (e.g., "crosses her arms", "glances away"). */
  action?: string;
  /** The NPC's current emotional state or reaction. */
  emotion?: string;
  /** The actor ID of who the NPC is addressing, if directed. */
  targetId?: string;
}

/** Scene context provided to the narrator for composing prose. */
export interface NarratorContext {
  /** The name of the current location. */
  locationName: string;
  /** A short description of the current scene or setting. */
  sceneDescription?: string;
  /** Display names of actors present in the scene. */
  presentActors: string[];
  /** Recent narrative history lines for continuity (last N passages). */
  recentHistory: string[];
  /** The player's most recent message or action, if any. */
  playerMessage?: string;
}

/** The result of a narration composition. */
export interface NarrationResult {
  /** The composed prose passage combining all NPC intents into narration. */
  prose: string;
  /** The original intents that were composed, for downstream reference. */
  sourceIntents: NpcIntent[];
}

/** Configuration for narrative style and constraints. */
export interface NarrationConfig {
  /** Narrative voice (e.g., "third-person", "second-person"). Defaults to "third-person". */
  voice: 'third-person' | 'second-person';
  /** Maximum approximate word count for the composed passage. */
  maxWords: number;
  /** Whether to include atmospheric/environmental details. */
  includeAtmosphere: boolean;
  /** Optional tone directive (e.g., "dark", "playful", "tense"). */
  tone?: string;
}

/** Default narration configuration. */
export const DEFAULT_NARRATION_CONFIG: NarrationConfig = {
  voice: 'third-person',
  maxWords: 200,
  includeAtmosphere: true,
};

/** Options for composing structured NPC intents into a narrative passage. */
export interface ComposeNarrationOptions {
  /** The LLM provider to use for prose generation. */
  llmProvider: LLMProvider;
  /** The structured NPC intents to compose into narration. */
  intents: NpcIntent[];
  /** Scene context for the narration. */
  context: NarratorContext;
  /** Optional narration config overrides. */
  config?: Partial<NarrationConfig>;
}

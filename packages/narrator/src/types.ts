import type { LLMProvider } from '@arcagentic/llm';
import type { NarratorContext, NarrationSource, NpcNarrationIntent } from '@arcagentic/schemas';

export type NpcIntent = NpcNarrationIntent;

/** The result of a narration composition. */
export interface NarrationResult {
  /** The composed prose passage combining all NPC intents into narration. */
  prose: string;
  /** The original intents that were composed, for downstream reference. */
  sourceIntents: NpcIntent[];
  /** How the narration was produced. */
  source: NarrationSource;
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
  /** Optional scene proximity directive used to intensify close-contact narration. */
  sceneProximity?: string;
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

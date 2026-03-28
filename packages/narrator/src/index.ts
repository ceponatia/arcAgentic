export type {
  NpcIntent,
  NarrationResult,
  NarrationConfig,
  ComposeNarrationOptions,
} from './types.js';

export type { NpcNarrationIntent, NarratorContext } from '@arcagentic/schemas';

export { DEFAULT_NARRATION_CONFIG } from './types.js';

export {
  composeNarration,
  composeNarrationFallback,
  buildNarratorSystemPrompt,
  buildNarratorUserPrompt,
} from './narrator.js';

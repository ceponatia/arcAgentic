export type {
  NpcIntent,
  NarratorContext,
  NarrationResult,
  NarrationConfig,
  ComposeNarrationOptions,
} from './types.js';

export { DEFAULT_NARRATION_CONFIG } from './types.js';

export {
  composeNarration,
  buildNarratorSystemPrompt,
  buildNarratorUserPrompt,
} from './narrator.js';

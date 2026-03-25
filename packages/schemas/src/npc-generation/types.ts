import type { z } from 'zod';
import type {
  NpcGenerationContextSchema,
  NpcGenerationRequestSchema,
  NpcGenerationResultMetaSchema,
  NpcGenerationResultSchema,
  NpcGenerationStrategySchema,
} from './schemas.js';

export type NpcGenerationContext = z.infer<typeof NpcGenerationContextSchema>;
export type NpcGenerationStrategy = z.infer<typeof NpcGenerationStrategySchema>;
export type NpcGenerationRequest = z.infer<typeof NpcGenerationRequestSchema>;
export type NpcGenerationResultMeta = z.infer<typeof NpcGenerationResultMetaSchema>;
export type NpcGenerationResult = z.infer<typeof NpcGenerationResultSchema>;

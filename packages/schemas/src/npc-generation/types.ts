import type { z } from 'zod';
import type {
  BatchGenerationRequestSchema,
  BatchGenerationResultMetaSchema,
  BatchGenerationResultSchema,
  NpcGenerationContextSchema,
  NpcGenerationRequestSchema,
  NpcGenerationResultMetaSchema,
  NpcGenerationResultSchema,
  NpcGenerationStrategySchema,
  NpcExpansionRequestSchema,
  NpcPopulationConfigSchema,
  PopulationDensitySchema,
  TierDistributionSchema,
} from './schemas.js';

export type NpcGenerationContext = z.infer<typeof NpcGenerationContextSchema>;
export type PopulationDensity = z.infer<typeof PopulationDensitySchema>;
export type TierDistribution = z.infer<typeof TierDistributionSchema>;
export type NpcPopulationConfig = z.infer<typeof NpcPopulationConfigSchema>;
export type NpcGenerationStrategy = z.infer<typeof NpcGenerationStrategySchema>;
export type NpcGenerationRequest = z.infer<typeof NpcGenerationRequestSchema>;
export type NpcGenerationResultMeta = z.infer<typeof NpcGenerationResultMetaSchema>;
export type NpcGenerationResult = z.infer<typeof NpcGenerationResultSchema>;
export type BatchGenerationRequest = z.infer<typeof BatchGenerationRequestSchema>;
export type BatchGenerationResultMeta = z.infer<typeof BatchGenerationResultMetaSchema>;
export type BatchGenerationResult = z.infer<typeof BatchGenerationResultSchema>;
export type NpcExpansionRequest = z.infer<typeof NpcExpansionRequestSchema>;

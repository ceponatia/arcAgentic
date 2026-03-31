import { z } from 'zod';
import { BODY_REGIONS } from '../body-regions/regions.js';
import { BUILT_IN_APPEAL_TAG_IDS } from './appeal-tag-data.js';

export const APPEAL_TAG_CATEGORIES = ['body', 'sensory'] as const;

export type AppealTagCategory = (typeof APPEAL_TAG_CATEGORIES)[number];

export const AppealTagCategorySchema = z.enum(APPEAL_TAG_CATEGORIES);

export const AppealTagDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  category: AppealTagCategorySchema,
  description: z.string().min(1),
  bodyRegions: z.array(z.enum(BODY_REGIONS)),
  promptTemplate: z.string().min(1).max(300),
  triggerKeywords: z.array(z.string().min(1)).min(1),
});

export type AppealTagDefinition = z.infer<typeof AppealTagDefinitionSchema>;

export const AppealTagIdSchema = z.enum(BUILT_IN_APPEAL_TAG_IDS);

export type AppealTagId = z.infer<typeof AppealTagIdSchema>;
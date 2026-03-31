import { z } from 'zod';

/**
 * Canonical schema for episodic memory summaries returned by retrieval
 * and consumed by actor cognition. Cross-package boundary contract.
 */
export const EpisodicMemorySummarySchema = z.object({
  nodeId: z.string(),
  content: z.string(),
  importance: z.number(),
  learnedAt: z.date().optional(),
});

export type EpisodicMemorySummary = z.infer<typeof EpisodicMemorySummarySchema>;
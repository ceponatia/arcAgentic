export type { EpisodicMemorySummary } from '@arcagentic/schemas';

export interface EpisodicMemoryInput {
  sessionId: string;
  actorId: string;
  sourceEventId?: string;
  learnedAt: Date;
  content: string;
  summary?: string;
  importance: number;
  decayRate: number;
  sourceType: 'performed' | 'witnessed' | 'felt';
}

export interface EpisodicRecallQuery {
  sessionId: string;
  actorId: string;
  queryText: string;
  maxNodes?: number;
  minScore?: number;
}

import { insertKnowledgeNode, type OwnerEmail } from '@arcagentic/db';

import type { RetrievalEmbeddingService } from '../types.js';
import type { EpisodicMemoryInput } from './types.js';

export interface EpisodicMemoryWriterOptions {
  ownerEmail: OwnerEmail;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Persist a single NPC episodic memory as an embedded knowledge node.
 *
 * The current DB insert helper does not expose the `learnedAt` column, so this
 * phase persists the remaining episodic fields through the existing public API.
 */
export async function writeEpisodicMemory(
  input: EpisodicMemoryInput,
  embeddingService: RetrievalEmbeddingService,
  options: EpisodicMemoryWriterOptions
): Promise<string> {
  const [embedding] = await embeddingService.embed([input.content]);

  if (!embedding) {
    throw new Error('Embedding service returned no embedding.');
  }

  const record = await insertKnowledgeNode({
    sessionId: input.sessionId,
    ownerEmail: options.ownerEmail,
    actorId: input.actorId,
    nodeType: 'episodic',
    content: input.content,
    importance: clamp(input.importance, 0.3, 0.95),
    decayRate: clamp(input.decayRate, 0, 0.03),
    sourceType: input.sourceType,
    embedding,
    ...(input.summary ? { summary: input.summary } : {}),
    ...(input.sourceEventId ? { sourceEventId: input.sourceEventId } : {}),
  });

  return record.id;
}

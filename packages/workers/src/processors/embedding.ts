import { type Processor } from 'bullmq';
import { createLogger, type Logger } from '@arcagentic/logger';
import { updateNodeEmbedding } from '@arcagentic/db/node';
import { type JobData, type EmbeddingTask, type JobResult } from '../types.js';

const createWorkersLogger = createLogger as (pkg: string, subsystem?: string) => Logger;
const log = createWorkersLogger('workers', 'embedding');

interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

/**
 * Creates a processor for embedding generation.
 */
export const createEmbeddingProcessor = (
  embeddingProvider: EmbeddingProvider
): Processor<JobData<EmbeddingTask>, JobResult> => {
  return async (job) => {
    try {
      const payload = job.data?.payload;
      if (!payload || typeof payload.nodeId !== 'string' || typeof payload.text !== 'string') {
        return {
          success: false,
          error: 'Missing embedding payload',
        };
      }

      const { nodeId, text } = payload;

      log.info({ nodeId, textLength: text.length }, 'generating embedding');
      const embeddings = await embeddingProvider.embed([text]);
      const embedding = embeddings[0];

      if (!embedding) {
        return {
          success: false,
          error: 'Embedding provider returned no embedding',
        };
      }

      const updatedNode = await updateNodeEmbedding(nodeId, embedding);

      if (!updatedNode) {
        return {
          success: false,
          error: `Knowledge node not found for embedding update: ${nodeId}`,
        };
      }

      log.info({ nodeId, dimensions: embedding.length }, 'persisted embedding');

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
};

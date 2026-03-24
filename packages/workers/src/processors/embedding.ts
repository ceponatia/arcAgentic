import { type Processor } from 'bullmq';
import { createLogger, type Logger } from '@arcagentic/logger';
import { type JobData, type EmbeddingTask, type JobResult } from '../types.js';

const createWorkersLogger = createLogger as (pkg: string, subsystem?: string) => Logger;
const log = createWorkersLogger('workers', 'embedding');

/**
 * Creates a processor for embedding generation.
 */
export const createEmbeddingProcessor = (): Processor<JobData<EmbeddingTask>, JobResult> => {
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
      // In a real implementation, this would call an embedding service (e.g. OpenAI)
      // and update the knowledge_nodes table in Postgres.

      // Mock duration
      await new Promise((resolve) => setTimeout(resolve, 200));

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

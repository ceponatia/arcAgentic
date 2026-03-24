import { type Processor } from 'bullmq';
import type { WorldBus } from '@arcagentic/bus';
import { type JobData, type TickTask, type JobResult } from '../types.js';

/**
 * Creates a processor for simulation ticks.
 */
export const createTickProcessor = (bus: WorldBus): Processor<JobData<TickTask>, JobResult> => {
  return async (job) => {
    const { payload } = job.data;

    try {
      await bus.emit({
        type: 'TICK',
        tick: payload.tickCount,
        timestamp: new Date(payload.timestamp),
      });

      return {
        success: true,
        eventsEmitted: 1,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
};

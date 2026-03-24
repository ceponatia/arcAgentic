import { type Queue } from 'bullmq';
import { createLogger, type Logger } from '@arcagentic/logger';
import { type JobData, type TickTask, type JobResult } from '../types.js';

const createWorkersLogger = createLogger as (pkg: string, subsystem?: string) => Logger;
const log = createWorkersLogger('workers', 'scheduler');

export class Scheduler {
  constructor(private tickQueue: Queue<JobData<TickTask>, JobResult>) { }

  /**
   * Start the recurring world tick job.
   */
  async startWorldTick(sessionId: string, intervalMs = 1000) {
    const jobName = `tick-${sessionId}`;

    const repeatableJobs = await this.tickQueue.getRepeatableJobs();
    const existingJob = repeatableJobs.find((job) => job.name === jobName);
    if (existingJob && typeof existingJob.every === 'number' && existingJob.every === intervalMs) {
      log.info({ sessionId, intervalMs }, 'world tick already scheduled');
      return;
    }
    if (existingJob) {
      await this.tickQueue.removeRepeatableByKey(existingJob.key);
    }

    // Add new repeatable job
    await this.tickQueue.add(
      jobName,
      {
        sessionId,
        payload: {
          tickCount: 0, // This will need to be tracked or derived
          timestamp: Date.now(),
        },
      },
      {
        repeat: {
          every: intervalMs,
        },
        removeOnComplete: true,
      }
    );

    log.info({ sessionId, intervalMs }, 'started world tick');
  }

  /**
   * Stop the recurring world tick job.
   */
  async stopWorldTick(sessionId: string) {
    const jobName = `tick-${sessionId}`;
    const repeatableJobs = await this.tickQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === jobName) {
        await this.tickQueue.removeRepeatableByKey(job.key);
      }
    }
    log.info({ sessionId }, 'stopped world tick');
  }
}

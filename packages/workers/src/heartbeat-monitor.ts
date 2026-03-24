import type { PresenceRecord, PresenceSchedulerStopOnly } from '@arcagentic/schemas';
import { createLogger, type Logger } from '@arcagentic/logger';

const DEFAULT_MONITOR_INTERVAL_MS = 30_000;
const createWorkersLogger = createLogger as (pkg: string, subsystem?: string) => Logger;
const log = createWorkersLogger('workers', 'heartbeat');

type PresenceScheduler = PresenceSchedulerStopOnly;

export interface PresenceTracker {
  listSessions: () => PresenceRecord[];
  removeSession: (sessionId: string) => void;
}

export interface HeartbeatMonitorConfig {
  presence: PresenceTracker;
  scheduler: PresenceScheduler;
  pauseThresholdMs: number;
  intervalMs?: number;
  now?: () => Date;
}

/**
 * Periodically pauses sessions that have not sent heartbeats recently.
 */
export class HeartbeatMonitor {
  private readonly presence: PresenceTracker;
  private readonly scheduler: PresenceScheduler;
  private readonly pauseThresholdMs: number;
  private readonly intervalMs: number;
  private readonly now: () => Date;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(config: HeartbeatMonitorConfig) {
    this.presence = config.presence;
    this.scheduler = config.scheduler;
    this.pauseThresholdMs = config.pauseThresholdMs;
    this.intervalMs = config.intervalMs ?? DEFAULT_MONITOR_INTERVAL_MS;
    this.now = config.now ?? (() => new Date());
  }

  /**
   * Start the heartbeat monitor interval.
   */
  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      void this.checkOnce();
    }, this.intervalMs);
    log.info('started heartbeat monitor');
  }

  /**
   * Stop the heartbeat monitor interval.
   */
  stop(): void {
    if (!this.intervalId) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
    log.info('stopped heartbeat monitor');
  }

  /**
   * Run a single heartbeat check.
   */
  async checkOnce(): Promise<void> {
    const now = this.now();
    const sessions = this.presence.listSessions();

    for (const session of sessions) {
      const msSinceHeartbeat = now.getTime() - session.lastHeartbeatAt.getTime();
      if (msSinceHeartbeat <= this.pauseThresholdMs) continue;

      try {
        await this.scheduler.stopWorldTick(session.sessionId);
        this.presence.removeSession(session.sessionId);
        log.info(
          { sessionId: session.sessionId, msSinceHeartbeat },
          'paused session after missing heartbeat'
        );
      } catch (error) {
        log.error(
          { err: error, sessionId: session.sessionId, msSinceHeartbeat },
          'failed to pause stale session'
        );
      }
    }
  }
}

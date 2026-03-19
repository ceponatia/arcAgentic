import { worldBus } from '@arcagentic/bus';

/**
 * In-process TICK source for single-instance and development deployments.
 *
 * Emits `TICK` events to the {@link worldBus} on a configurable timer interval.
 * The {@link Scheduler} (in this package) subscribes to these events to resolve
 * NPC schedules.
 *
 * For production multi-instance deployments, use the BullMQ-based Scheduler in
 * `@arcagentic/workers` instead, which provides per-session Redis-backed tick
 * scheduling with horizontal scaling.
 */
export class TickEmitter {
  private interval: NodeJS.Timeout | null = null;
  private currentTick = 0;

  /**
   * Start emitting TICK events at the given interval.
   * Calling `start()` when already running is a no-op.
   */
  start(intervalMs = 1000): void {
    if (this.interval) return;
    this.interval = setInterval(() => {
      void this.emitTick();
    }, intervalMs);
  }

  /**
   * Stop the tick timer.
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Manually emit a single TICK event.
   * Useful for turn-based advancement where the caller controls pacing.
   */
  async emitTick(): Promise<void> {
    this.currentTick++;
    await worldBus.emit({
      type: 'TICK',
      tick: this.currentTick,
      timestamp: new Date(),
    });
  }

  /** Return the current tick counter. */
  getCurrentTick(): number {
    return this.currentTick;
  }
}

export const tickEmitter = new TickEmitter();

import type { WorldEvent } from '@arcagentic/schemas';

/**
 * A Reducer is a pure function that takes the current state and an event,
 * and returns the new state.
 */
export type Reducer<S> = (currentState: S, event: WorldEvent) => S;

/**
 * A Projection defines a named domain of state and how it is updated by events.
 */
export interface Projection<S> {
  name: string;
  reducer: Reducer<S>;
  initialState: S;
}

/**
 * Lightweight metadata for listing snapshots without loading state.
 */
export interface SnapshotHeader {
  sessionId: string;
  sequence: bigint;
  timestamp: Date;
  version: number;
}

/**
 * Type for processing events in bulk for replay optimization.
 */
export interface EventBatch {
  sessionId: string;
  events: WorldEvent[];
  startSequence: bigint;
  endSequence: bigint;
}

/**
 * Configuration for Projector.replay()
 */
export interface ReplayOptions {
  untilSeq?: bigint;
  fastForward?: boolean;
  batchSize?: number;
}

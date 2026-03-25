import type { BaseActorState } from '../base/types.js';

/** Dialogue entry tracked by the player actor. */
export interface PlayerDialogueEntry {
  actorId: string;
  content: string;
  timestamp: number;
}

/** Player-specific runtime state. */
export interface PlayerRuntimeState extends BaseActorState {
  type: 'player';
  /** Current location ID, updated on MOVED events */
  locationId: string;
  /** Set of item IDs currently held */
  inventory: Set<string>;
  /** Recent dialogue entries (bounded buffer) */
  recentDialogue: PlayerDialogueEntry[];
  /** Latest game tick number */
  lastTick: number;
  /** Whether the actor is actively running */
  active: boolean;
}
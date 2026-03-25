import type { WorldEvent } from '@arcagentic/schemas';
import type { Actor, ActorConfig, BaseActorState } from '../base/types.js';
import { BaseActorLifecycle } from '../base/lifecycle.js';
import type { PlayerDialogueEntry, PlayerRuntimeState } from './types.js';

const MAX_DIALOGUE_ENTRIES = 50;

export class PlayerActor implements Actor {
  readonly id: string;
  readonly type = 'player' as const;
  readonly sessionId: string;

  private readonly lifecycle: BaseActorLifecycle;
  private state: PlayerRuntimeState;
  private started = false;

  constructor(config: ActorConfig) {
    const now = new Date();

    this.id = config.id;
    this.sessionId = config.sessionId;
    this.lifecycle = new BaseActorLifecycle(this);
    this.state = {
      id: config.id,
      type: this.type,
      locationId: config.locationId,
      sessionId: config.sessionId,
      spawnedAt: now,
      lastActiveAt: now,
      inventory: new Set<string>(),
      recentDialogue: [],
      lastTick: 0,
      active: false,
    };
  }

  start(): void {
    if (this.started) return;
    void this.lifecycle.start();
    this.started = true;
    this.state.active = true;
  }

  stop(): void {
    if (!this.started) return;
    this.lifecycle.stop();
    this.started = false;
    this.state.active = false;
  }

  send(event: WorldEvent): void {
    let handled = false;

    switch (event.type) {
      case 'MOVED': {
        if (!this.isMatchingSessionEvent(event.sessionId) || event.actorId !== this.id) {
          break;
        }

        this.state.locationId = event.toLocationId;
        handled = true;
        break;
      }
      case 'SPOKE': {
        const isRelevantDialogue = event.actorId === this.id || event.targetActorId === this.id;

        if (!this.isMatchingSessionEvent(event.sessionId) || !isRelevantDialogue) {
          break;
        }

        this.appendDialogueEntry({
          actorId: event.actorId,
          content: event.content,
          timestamp: event.timestamp?.getTime() ?? Date.now(),
        });
        handled = true;
        break;
      }
      case 'ITEM_ACQUIRED': {
        if (!this.isMatchingSessionEvent(event.sessionId) || event.actorId !== this.id) {
          break;
        }

        this.state.inventory.add(event.itemId);
        handled = true;
        break;
      }
      case 'ITEM_DROPPED': {
        if (!this.isMatchingSessionEvent(event.sessionId) || event.actorId !== this.id) {
          break;
        }

        this.state.inventory.delete(event.itemId);
        handled = true;
        break;
      }
      case 'TICK': {
        if (!this.isMatchingSessionEvent(event.sessionId)) {
          break;
        }

        this.state.lastTick = event.tick;
        handled = true;
        break;
      }
      case 'ACTOR_SPAWN': {
        if (!this.isMatchingSessionEvent(event.sessionId) || event.actorId !== this.id) {
          break;
        }

        this.state.active = true;
        this.state.locationId = event.locationId;
        handled = true;
        break;
      }
      case 'ACTOR_DESPAWN': {
        if (!this.isMatchingSessionEvent(event.sessionId) || event.actorId !== this.id) {
          break;
        }

        this.state.active = false;
        handled = true;
        break;
      }
      default:
        break;
    }

    if (handled) {
      this.state.lastActiveAt = new Date();
    }
  }

  getSnapshot(): BaseActorState {
    return {
      id: this.id,
      type: this.type,
      locationId: this.state.locationId,
      sessionId: this.sessionId,
      spawnedAt: new Date(this.state.spawnedAt),
      lastActiveAt: new Date(this.state.lastActiveAt),
    };
  }

  getPlayerState(): PlayerRuntimeState {
    return {
      ...this.state,
      spawnedAt: new Date(this.state.spawnedAt),
      lastActiveAt: new Date(this.state.lastActiveAt),
      inventory: new Set(this.state.inventory),
      recentDialogue: [...this.state.recentDialogue],
    };
  }

  private isMatchingSessionEvent(eventSessionId: string | undefined): boolean {
    return eventSessionId === undefined || eventSessionId === this.sessionId;
  }

  private appendDialogueEntry(entry: PlayerDialogueEntry): void {
    this.state.recentDialogue.push(entry);

    if (this.state.recentDialogue.length > MAX_DIALOGUE_ENTRIES) {
      this.state.recentDialogue.shift();
    }
  }
}

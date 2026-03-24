import { worldBus } from '@arcagentic/bus';
import type { WorldEvent } from '@arcagentic/schemas';

/**
 * DialogueService
 *
 * Converts `SPEAK_INTENT` events into `SPOKE` effects so NPC speech becomes observable
 * and persistable on the World Bus. This keeps the pipeline deterministic and allows
 * downstream consumers (projections, clients) to listen to a single effect type.
 */
export class DialogueService {
  private started = false;

  private handler = async (event: WorldEvent): Promise<void> => {
    if (event.type !== 'SPEAK_INTENT') return;

    const actorId = event.actorId ?? 'unknown';
    const sessionId = event.sessionId;
    const content = event.content;
    const timestamp = event.timestamp ?? new Date();

    if (!sessionId) {
      // Speech without session context cannot be persisted or routed safely.
      return;
    }

    const spokeEvent: WorldEvent = {
      type: 'SPOKE',
      actorId,
      content,
      targetActorId: event.targetActorId,
      sessionId,
      timestamp,
    };

    await worldBus.emit(spokeEvent);
  };

  start(): void {
    if (this.started) return;
    void worldBus.subscribe(this.handler);
    this.started = true;
  }

  stop(): void {
    if (!this.started) return;
    worldBus.unsubscribe(this.handler);
    this.started = false;
  }
}

export const dialogueService = new DialogueService();

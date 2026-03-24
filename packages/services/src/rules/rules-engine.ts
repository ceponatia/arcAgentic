import { worldBus } from '@arcagentic/bus';
import { createLogger } from '@arcagentic/logger';
import { extractLocationId, type Intent, type WorldEvent } from '@arcagentic/schemas';
import { Validators, type ValidationContext } from './validators.js';
import {
  getActorState,
  getActorsAtLocation,
  getInventoryItems,
  getSessionGameTime,
} from '@arcagentic/db';

const log = createLogger('services', 'rules');

function isIntentEvent(event: WorldEvent): event is Intent {
  return event.type.endsWith('_INTENT');
}

/**
 * Rules Engine Service
 *
 * Validates intents and rejects invalid actions.
 */
export class RulesEngine {
  private started = false;

  private handler = async (event: WorldEvent): Promise<void> => {
    // Only validate *_INTENT events
    if (!isIntentEvent(event)) {
      return;
    }

    const sessionId = event.sessionId;
    const actorId = event.actorId;

    if (!sessionId || !actorId) {
      log.warn(
        { eventType: event.type, sessionId, actorId },
        'missing sessionId or actorId'
      );
      return;
    }

    try {
      const context = await this.buildContext(sessionId, actorId);
      const result = await Validators.validateAction(event, context);

      if (!result.valid) {
        log.debug(
          {
            eventType: event.type,
            sessionId,
            actorId,
            reason: result.reason,
            suggestion: result.suggestion,
          },
          'action rejected'
        );

        await worldBus.emit({
          type: 'ACTION_REJECTED',
          originalEventType: event.type,
          actorId,
          reason: result.reason,
          suggestion: result.suggestion,
          sessionId,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      log.error(
        { err: error, eventType: event.type, sessionId, actorId },
        'error validating action'
      );
      // On error, allow the action (fail open for now)
    }
  };

  /**
   * Build validation context from session state.
   */
  private async buildContext(
    sessionId: string,
    actorId: string
  ): Promise<ValidationContext> {
    const actorState = await getActorState(sessionId, actorId);
    const currentLocationId = extractLocationId(actorState?.state) ?? 'unknown';

    const actorsAtLocation = await getActorsAtLocation(sessionId, currentLocationId);
    const actorIds = actorsAtLocation
      .map((actor) => actor.actorId)
      .filter((id) => id !== actorId);

    const inventory = await getInventoryItems(sessionId, actorId);
    const inventoryItemIds = inventory.map((item) => item.id);

    const gameTime = await getSessionGameTime(sessionId);

    const context: ValidationContext = {
      sessionId,
      actorId,
      currentLocationId,
      actorsAtLocation: actorIds,
      inventoryItemIds,
    };

    if (gameTime) {
      context.gameTime = gameTime;
    }

    return context;
  }

  start(): void {
    if (this.started) return;
    void worldBus.subscribe(this.handler);
    this.started = true;
    log.info('started');
  }

  stop(): void {
    if (!this.started) return;
    worldBus.unsubscribe(this.handler);
    this.started = false;
    log.info('stopped');
  }
}

export const rulesEngine = new RulesEngine();

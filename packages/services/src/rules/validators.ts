import type { ActionValidationResult, ActorState, GameTime, WorldEvent } from '@arcagentic/schemas';
import { createLogger } from '@arcagentic/logger';
import { ActorStateSchema, NpcLocationStateSchema, isRecord } from '@arcagentic/schemas';
import {
  getLocationConnections,
  getActorState,
  getInventoryItem,
  LocationDataValidationError,
} from '@arcagentic/db';

const log = createLogger('services', 'rules');

/**
 * Validation result for an action.
 */
type ValidationResult = ActionValidationResult;

/**
 * Game state context for validation.
 * TODO: Define proper GameState type in schemas when state structure is finalized.
 */
export interface ValidationContext {
  sessionId: string;
  actorId: string;
  currentLocationId: string;
  /** Actors present at current location */
  actorsAtLocation: string[];
  /** Items in actor's inventory */
  inventoryItemIds: string[];
  /** Current game time */
  gameTime?: GameTime;
}

type MoveIntentEvent = Extract<WorldEvent, { type: 'MOVE_INTENT' }>;
type SpeakIntentEvent = Extract<WorldEvent, { type: 'SPEAK_INTENT' }>;
type UseItemIntentEvent = Extract<WorldEvent, { type: 'USE_ITEM_INTENT' }>;
type AttackIntentEvent = Extract<WorldEvent, { type: 'ATTACK_INTENT' }>;
type TakeItemIntentEvent = Extract<WorldEvent, { type: 'TAKE_ITEM_INTENT' }>;

const InterruptibleLocationStateSchema = NpcLocationStateSchema.pick({ interruptible: true });

/**
 * Validators Service
 *
 * Validation logic for various game actions.
 */
export class Validators {
  /**
   * Validate if an action is possible in the current state.
   * @param action - The world event/action to validate
   * @param context - Current game state context for validation
   */
  static async validateAction(
    action: WorldEvent,
    context: ValidationContext
  ): Promise<ValidationResult> {
    switch (action.type) {
      case 'MOVE_INTENT':
        return validateMoveIntent(action, context);
      case 'SPEAK_INTENT':
        return validateSpeakIntent(action, context);
      case 'USE_ITEM_INTENT':
        return validateUseItemIntent(action, context);
      case 'ATTACK_INTENT':
        return validateAttackIntent(action, context);
      case 'TAKE_ITEM_INTENT':
        return validateTakeItemIntent(action, context);
      default:
        // No validator for this event type - allow by default
        return { valid: true, reason: '' };
    }
  }
}

function getInterruptibleFlagFromActorState(state: ActorState): boolean | null {
  const locationState = 'locationState' in state ? state.locationState : undefined;
  if (typeof locationState?.interruptible === 'boolean') {
    return locationState.interruptible;
  }

  const simulationState = 'simulation' in state ? state.simulation?.currentState : undefined;
  if (typeof simulationState?.interruptible === 'boolean') {
    return simulationState.interruptible;
  }

  return null;
}

function getInterruptibleFlag(state: unknown): boolean | null {
  const parsedActorState = ActorStateSchema.safeParse(state);
  if (parsedActorState.success) {
    return getInterruptibleFlagFromActorState(parsedActorState.data);
  }

  if (!isRecord(state)) return null;

  const locationState = InterruptibleLocationStateSchema.safeParse(state['locationState']);
  if (locationState.success) {
    return locationState.data.interruptible;
  }

  const simulation = state['simulation'];
  if (isRecord(simulation)) {
    const currentState = InterruptibleLocationStateSchema.safeParse(simulation['currentState']);
    if (currentState.success) {
      return currentState.data.interruptible;
    }
  }

  const interruptible = state['interruptible'];
  return typeof interruptible === 'boolean' ? interruptible : null;
}

// =============================================================================
// Validation Rules
// =============================================================================

/**
 * Validate MOVE_INTENT - check if destination is reachable.
 */
async function validateMoveIntent(
  event: MoveIntentEvent,
  context: ValidationContext
): Promise<ValidationResult> {
  let connections: Awaited<ReturnType<typeof getLocationConnections>>;

  try {
    connections = await getLocationConnections(context.sessionId, context.currentLocationId);
  } catch (error) {
    if (error instanceof LocationDataValidationError) {
      log.error(
        {
          err: error,
          sessionId: context.sessionId,
          currentLocationId: context.currentLocationId,
          details: error.details,
        },
        'invalid location map data detected'
      );
      return {
        valid: false,
        reason: 'Location map data is invalid. Please delete or repair the map.',
      };
    }
    throw error;
  }
  const isConnected = connections.some(
    (connection) => connection.targetLocationId === event.destinationId
  );

  if (!isConnected) {
    const exits = connections.map((connection) => connection.targetName ?? connection.targetLocationId);

    const result: ValidationResult = {
      valid: false,
      reason: `Cannot reach ${event.destinationId} from current location`,
    };

    if (exits.length > 0) {
      result.suggestion = `Available exits: ${exits.join(', ')}`;
    }

    return result;
  }

  return { valid: true, reason: '' };
}

/**
 * Validate SPEAK_INTENT - check if target is present.
 */
async function validateSpeakIntent(
  event: SpeakIntentEvent,
  context: ValidationContext
): Promise<ValidationResult> {
  if (!event.content.trim()) {
    return { valid: false, reason: 'Cannot speak without content' };
  }

  if (event.targetActorId) {
    const isPresent = context.actorsAtLocation.includes(event.targetActorId);

    if (!isPresent) {
      return {
        valid: false,
        reason: `${event.targetActorId} is not at your current location`,
      };
    }

    const targetState = await getActorState(context.sessionId, event.targetActorId);
    if (targetState) {
      const interruptible = getInterruptibleFlag(targetState.state);
      if (interruptible === false) {
        return {
          valid: false,
          reason: `${event.targetActorId} is too busy to talk right now`,
          suggestion: 'Try again later or wait for them to finish',
        };
      }
    }
  }

  return { valid: true, reason: '' };
}

/**
 * Validate USE_ITEM_INTENT - check if actor has item.
 */
async function validateUseItemIntent(
  event: UseItemIntentEvent,
  context: ValidationContext
): Promise<ValidationResult> {
  const hasItem = context.inventoryItemIds.includes(event.itemId);

  if (!hasItem) {
    const item = await getInventoryItem(
      context.sessionId,
      context.actorId,
      event.itemId
    );
    if (!item) {
      return {
        valid: false,
        reason: `You don't have "${event.itemId}"`,
      };
    }
  }

  return { valid: true, reason: '' };
}

/**
 * Validate ATTACK_INTENT - check combat rules.
 */
function validateAttackIntent(
  event: AttackIntentEvent,
  context: ValidationContext
): ValidationResult {
  if (!context.actorsAtLocation.includes(event.targetActorId)) {
    return {
      valid: false,
      reason: `${event.targetActorId} is not here`,
    };
  }

  return { valid: true, reason: '' };
}

/**
 * Validate TAKE_ITEM_INTENT - check if item is available.
 */
function validateTakeItemIntent(
  event: TakeItemIntentEvent,
  _context: ValidationContext
): ValidationResult {
  void _context;
  void event;

  return { valid: true, reason: '' };
}

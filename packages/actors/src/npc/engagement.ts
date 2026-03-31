import type { WorldEvent } from '@arcagentic/schemas';
import type {
  ClassifiedEvent,
  CognitionContextExtras,
  EngagementDecision,
  EventAddressType,
} from './types.js';
import { getStringField, getWorldEventPayload } from './event-access.js';

function withContinuationHint(
  decision: Omit<EngagementDecision, 'continuationHint'>,
  continuationHint?: string
): EngagementDecision {
  return continuationHint !== undefined
    ? { ...decision, continuationHint }
    : decision;
}

function resolveEventLocationId(event: WorldEvent): string | undefined {
  const payload = getWorldEventPayload(event);

  return (
    getStringField(event, 'locationId') ??
    getStringField(payload, 'locationId') ??
    getStringField(event, 'toLocationId') ??
    getStringField(payload, 'toLocationId') ??
    getStringField(event, 'fromLocationId') ??
    getStringField(payload, 'fromLocationId')
  );
}

function resolveTargetActorId(event: WorldEvent): string | undefined {
  const payload = getWorldEventPayload(event);

  return getStringField(event, 'targetActorId') ?? getStringField(payload, 'targetActorId');
}

export function classifyEventForNpc(
  event: WorldEvent,
  npcActorId: string,
  npcLocationId: string,
  playerProximity?: string
): EventAddressType {
  if (event.type === 'SPOKE' && getStringField(event, 'actorId') !== npcActorId) {
    if (resolveTargetActorId(event) === npcActorId) {
      return 'direct';
    }

    const eventLocationId = resolveEventLocationId(event);
    if (eventLocationId && eventLocationId !== npcLocationId) {
      return 'not-perceived';
    }

    if (playerProximity === 'distant') {
      return 'ambient';
    }

    return 'overheard';
  }

  if (playerProximity === 'distant') {
    return 'ambient';
  }

  return 'overheard';
}

export function evaluateEngagement(
  classifiedEvents: ClassifiedEvent[],
  extras: {
    playerProximity?: string;
    currentActivity?: CognitionContextExtras['currentActivity'];
    interruptible?: boolean;
    socialBias?: string;
  }
): EngagementDecision {
  const hasDirectAddress = classifiedEvents.some((entry) => entry.addressType === 'direct');
  const hasOverheard = classifiedEvents.some((entry) => entry.addressType === 'overheard');
  const hasAmbient = classifiedEvents.some((entry) => entry.addressType === 'ambient');

  if (hasDirectAddress) {
    if (extras.interruptible === false) {
      return withContinuationHint(
        {
          shouldAct: false,
          reason: 'Non-interruptible activity despite direct address',
        },
        extras.currentActivity?.description
      );
    }

    return { shouldAct: true, reason: 'Directly addressed by player' };
  }

  if (extras.playerProximity === 'distant') {
    return withContinuationHint(
      {
        shouldAct: false,
        reason: 'Too far away to meaningfully engage',
      },
      extras.currentActivity?.description
    );
  }

  const engagement = extras.currentActivity?.engagement;
  if ((engagement === 'focused' || engagement === 'absorbed') && !hasDirectAddress) {
    return withContinuationHint(
      {
        shouldAct: false,
        reason: `Absorbed in ${extras.currentActivity?.description ?? 'current activity'}`,
      },
      extras.currentActivity?.description
    );
  }

  if (extras.interruptible === false && !hasDirectAddress) {
    return withContinuationHint(
      {
        shouldAct: false,
        reason: 'Not interruptible and not directly addressed',
      },
      extras.currentActivity?.description
    );
  }

  if (hasOverheard) {
    if (extras.socialBias === 'withdraw' || extras.socialBias === 'avoid') {
      return withContinuationHint(
        {
          shouldAct: false,
          reason: 'Socially withdrawn; overheard but not addressed',
        },
        extras.currentActivity?.description
      );
    }

    return { shouldAct: true, reason: 'Overheard nearby speech, may choose to respond' };
  }

  if (hasAmbient && !hasOverheard) {
    return withContinuationHint(
      {
        shouldAct: false,
        reason: 'Only ambient events, nothing compelling for engagement',
      },
      extras.currentActivity?.description
    );
  }

  return withContinuationHint(
    {
      shouldAct: false,
      reason: 'No events warranting action',
    },
    extras.currentActivity?.description
  );
}

import type {
  AttachmentStyle,
  PersonalityMap,
  SocialPattern,
  StressBehavior,
  WorldEvent,
} from '@arcagentic/schemas';
import type { PerceptionContext } from './types.js';

export type UrgencyLevel = 'low' | 'normal' | 'elevated' | 'high' | 'critical';
export type EngagementBias = 'withdraw' | 'avoid' | 'neutral' | 'engage' | 'confront';

export interface PersonalityModifiers {
  urgency: UrgencyLevel;
  socialBias: EngagementBias;
  contextNotes: string[];
}

const URGENCY_LEVELS: UrgencyLevel[] = ['low', 'normal', 'elevated', 'high', 'critical'];

function hasEventType(events: WorldEvent[], eventType: WorldEvent['type']): boolean {
  return events.some((event) => event.type === eventType);
}

function hasAnyEventType(events: WorldEvent[], eventTypes: WorldEvent['type'][]): boolean {
  return events.some((event) => eventTypes.includes(event.type));
}

function applyUrgencyDelta(urgency: UrgencyLevel, delta: number): UrgencyLevel {
  const currentIndex = URGENCY_LEVELS.indexOf(urgency);
  const nextIndex = Math.min(
    URGENCY_LEVELS.length - 1,
    Math.max(0, currentIndex + delta)
  );

  return URGENCY_LEVELS.at(nextIndex) ?? 'normal';
}

function getStressPrimaryNote(primary: StressBehavior['primary'] | undefined): string | null {
  switch (primary) {
    case 'fight':
      return 'instinct to fight';
    case 'flight':
      return 'instinct to flee';
    case 'freeze':
      return 'tends to freeze';
    case 'fawn':
      return 'tends to appease';
    default:
      return null;
  }
}

export function computeStressModifier(
  stress: StressBehavior | undefined,
  events: WorldEvent[]
): Pick<PersonalityModifiers, 'urgency' | 'contextNotes'> {
  const contextNotes: string[] = [];
  const primaryNote = getStressPrimaryNote(stress?.primary);

  if (primaryNote) {
    contextNotes.push(primaryNote);
  }

  if (!hasAnyEventType(events, ['DAMAGED', 'DIED'])) {
    return { urgency: 'normal', contextNotes };
  }

  const threshold = stress?.threshold ?? 0.5;

  if (threshold < 0.3) {
    return {
      urgency: applyUrgencyDelta('normal', 2),
      contextNotes,
    };
  }

  if (threshold <= 0.6) {
    return {
      urgency: applyUrgencyDelta('normal', 1),
      contextNotes,
    };
  }

  return { urgency: 'normal', contextNotes };
}

export function computeSocialModifier(
  social: SocialPattern | undefined,
  attachment: AttachmentStyle | undefined,
  events: WorldEvent[]
): Pick<PersonalityModifiers, 'socialBias' | 'contextNotes'> {
  void attachment;

  if (!social) {
    return { socialBias: 'neutral', contextNotes: [] };
  }

  const contextNotes: string[] = [];
  let socialBias: EngagementBias;

  switch (social.conflictStyle ?? 'diplomatic') {
    case 'confrontational':
      socialBias = 'confront';
      break;
    case 'collaborative':
      socialBias = 'engage';
      break;
    case 'avoidant':
      socialBias = 'avoid';
      break;
    case 'passive-aggressive':
      socialBias = 'withdraw';
      contextNotes.push('tends toward passive aggression');
      break;
    case 'diplomatic':
    default:
      socialBias = 'neutral';
      break;
  }

  if (hasEventType(events, 'ACTOR_SPAWN')) {
    switch (social.strangerDefault ?? 'neutral') {
      case 'welcoming':
        contextNotes.push('welcoming with strangers');
        break;
      case 'guarded':
        contextNotes.push('guarded with strangers');
        break;
      case 'hostile':
        contextNotes.push('hostile toward strangers');
        break;
      case 'neutral':
      default:
        break;
    }
  }

  return { socialBias, contextNotes };
}

export function computeAttachmentModifier(
  attachment: AttachmentStyle | undefined,
  events: WorldEvent[]
): {
  urgencyDelta: number;
  socialBias: EngagementBias | null;
  contextNotes: string[];
} {
  if (!attachment || attachment === 'secure') {
    return { urgencyDelta: 0, socialBias: null, contextNotes: [] };
  }

  const hasDepartureEvent = hasEventType(events, 'ACTOR_DESPAWN');
  const hasSocialEvent = hasEventType(events, 'SPOKE');
  const contextNotes: string[] = [];
  let urgencyDelta = 0;
  let socialBias: EngagementBias | null = null;

  if (hasDepartureEvent) {
    if (attachment === 'anxious-preoccupied') {
      urgencyDelta += 1;
      contextNotes.push('fears abandonment');
    }

    if (attachment === 'fearful-avoidant') {
      urgencyDelta += 1;
      socialBias = 'avoid';
      contextNotes.push('conflicted about closeness');
    }
  }

  if (hasSocialEvent) {
    if (attachment === 'dismissive-avoidant') {
      socialBias = 'avoid';
      contextNotes.push('maintains emotional distance');
    }

    if (attachment === 'fearful-avoidant' && socialBias === null) {
      socialBias = 'avoid';
    }
  }

  return { urgencyDelta, socialBias, contextNotes };
}

export function applyPersonalityModifiers(
  personalityMap: PersonalityMap | undefined,
  perception: PerceptionContext
): PersonalityModifiers {
  if (!personalityMap) {
    return {
      urgency: 'normal',
      socialBias: 'neutral',
      contextNotes: [],
    };
  }

  const stressModifiers = computeStressModifier(personalityMap.stress, perception.relevantEvents);
  const socialModifiers = computeSocialModifier(
    personalityMap.social,
    personalityMap.attachment,
    perception.relevantEvents
  );
  const attachmentModifiers = computeAttachmentModifier(
    personalityMap.attachment,
    perception.relevantEvents
  );

  const urgency = applyUrgencyDelta(stressModifiers.urgency, attachmentModifiers.urgencyDelta);
  const socialBias = attachmentModifiers.socialBias ?? socialModifiers.socialBias;
  const contextNotes = Array.from(
    new Set([
      ...stressModifiers.contextNotes,
      ...socialModifiers.contextNotes,
      ...attachmentModifiers.contextNotes,
    ])
  );

  return {
    urgency,
    socialBias,
    contextNotes,
  };
}

export function isDefaultModifiers(modifiers: PersonalityModifiers): boolean {
  return (
    modifiers.urgency === 'normal' &&
    modifiers.socialBias === 'neutral' &&
    modifiers.contextNotes.length === 0
  );
}

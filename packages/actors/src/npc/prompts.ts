import type {
  CharacterProfile,
  DimensionScores,
  EmotionalState,
  Fear,
  SocialPattern,
  SpeechStyle,
  StressBehavior,
  Value,
} from '@arcagentic/schemas';
import type { PersonalityModifiers } from './personality-modifiers.js';
import type {
  CognitionContextExtras,
  NpcRelationshipContext,
  NpcRuntimeState,
  PerceptionContext,
} from './types.js';
import { getStringField } from './event-access.js';
import { isDefaultModifiers } from './personality-modifiers.js';

const EMOTION_ADJECTIVES = {
  joy: 'joyful',
  trust: 'trusting',
  fear: 'fearful',
  surprise: 'surprised',
  sadness: 'sad',
  disgust: 'disgusted',
  anger: 'angry',
  anticipation: 'anticipatory',
} as const;

function formatValuePriority(priority: number): string {
  if (priority <= 2) return 'paramount';
  if (priority <= 4) return 'strong';
  if (priority <= 6) return 'moderate';
  if (priority <= 8) return 'minor';
  return 'slight';
}

function formatFearIntensity(intensity: number): string {
  if (intensity <= 0.2) return 'faint';
  if (intensity <= 0.4) return 'mild';
  if (intensity <= 0.6) return 'moderate';
  if (intensity <= 0.8) return 'intense';
  return 'overwhelming';
}

function formatStressThreshold(threshold: number): string {
  if (threshold < 0.3) return 'low';
  if (threshold > 0.7) return 'high';
  return 'moderate';
}

function formatMoodStability(stability: number): string {
  if (stability < 0.3) return 'volatile';
  if (stability > 0.7) return 'stable';
  return 'moderate';
}

function formatAffinityLabel(value: number): string {
  if (value <= 0.2) return 'very low';
  if (value <= 0.4) return 'low';
  if (value <= 0.6) return 'moderate';
  if (value <= 0.8) return 'high';
  return 'very high';
}

function humanizeToken(value: string): string {
  return value.replaceAll('-', ' ');
}

function getPlayerRelationship(
  relationships?: CognitionContextExtras['relationships']
): NpcRelationshipContext | undefined {
  if (!relationships) {
    return undefined;
  }

  const directPlayerRelationship = relationships['player'];
  if (directPlayerRelationship) {
    return directPlayerRelationship;
  }

  for (const [actorId, relationship] of Object.entries(relationships)) {
    if (actorId.startsWith('player:')) {
      return relationship;
    }
  }

  return undefined;
}

function formatActorLabel(actorId: string, contextExtras?: CognitionContextExtras): string {
  if (!contextExtras?.playerName) {
    return actorId;
  }

  if (actorId === 'player' || actorId.startsWith('player:')) {
    return contextExtras.playerName;
  }

  return actorId;
}

function getDimensionLabel(
  dimension: keyof DimensionScores,
  polarity: 'high' | 'low'
): string {
  switch (dimension) {
    case 'openness':
      return polarity === 'high' ? 'open and curious' : 'conventional and practical';
    case 'conscientiousness':
      return polarity === 'high' ? 'disciplined and organized' : 'spontaneous and flexible';
    case 'extraversion':
      return polarity === 'high' ? 'outgoing and sociable' : 'reserved and introspective';
    case 'agreeableness':
      return polarity === 'high' ? 'cooperative and trusting' : 'competitive and skeptical';
    case 'neuroticism':
      return polarity === 'high' ? 'anxious and reactive' : 'calm and stable';
  }
}

function getEmotionAdjective(emotion: EmotionalState['moodBaseline']): string {
  switch (emotion) {
    case 'joy':
      return EMOTION_ADJECTIVES.joy;
    case 'trust':
      return EMOTION_ADJECTIVES.trust;
    case 'fear':
      return EMOTION_ADJECTIVES.fear;
    case 'surprise':
      return EMOTION_ADJECTIVES.surprise;
    case 'sadness':
      return EMOTION_ADJECTIVES.sadness;
    case 'disgust':
      return EMOTION_ADJECTIVES.disgust;
    case 'anger':
      return EMOTION_ADJECTIVES.anger;
    case 'anticipation':
      return EMOTION_ADJECTIVES.anticipation;
  }
}

function formatValues(values: Value[] | undefined): string | undefined {
  if (!values?.length) {
    return undefined;
  }

  const renderedValues = [...values]
    .sort((left, right) => left.priority - right.priority)
    .slice(0, 3)
    .map((value) => `${value.value} (${formatValuePriority(value.priority)})`);

  return `Values: ${renderedValues.join(', ')}`;
}

function formatFears(fears: Fear[] | undefined): string | undefined {
  if (!fears?.length) {
    return undefined;
  }

  const renderedFears = [...fears]
    .sort((left, right) => right.intensity - left.intensity)
    .map(
      (fear) =>
        `${fear.category} - "${fear.specific}" (${formatFearIntensity(fear.intensity)})`
    );

  return `Fears: ${renderedFears.join(', ')}`;
}

function formatDimensions(dimensions: DimensionScores | undefined): string | undefined {
  if (!dimensions) {
    return undefined;
  }

  const renderedDimensions = (
    [
      'openness',
      'conscientiousness',
      'extraversion',
      'agreeableness',
      'neuroticism',
    ] as const
  )
    .flatMap((dimension) => {
      const score = dimensions[dimension];
      if (score === undefined || (score >= 0.35 && score <= 0.65)) {
        return [];
      }

      const polarity = score < 0.35 ? 'low' : 'high';
      const label = getDimensionLabel(dimension, polarity);
      const isVery = score <= 0.2 || score >= 0.8;

      return [isVery ? `very ${label}` : label];
    });

  if (renderedDimensions.length === 0) {
    return undefined;
  }

  return `Personality: ${renderedDimensions.join(', ')}`;
}

function formatEmotionalBaseline(emotional: EmotionalState | undefined): string | undefined {
  if (!emotional) {
    return undefined;
  }

  const moodBaseline = emotional.moodBaseline ?? 'trust';
  const mood = getEmotionAdjective(moodBaseline);
  return `Emotional baseline: ${mood} mood, ${formatMoodStability(
    emotional.moodStability ?? 0.5
  )} stability, currently ${emotional.intensity ?? 'mild'} ${humanizeToken(
    emotional.current ?? 'anticipation'
  )}`;
}

function formatSocialPatterns(social: SocialPattern | undefined): string | undefined {
  if (!social) {
    return undefined;
  }

  const strangerDefault = social.strangerDefault ?? 'neutral';
  const warmthRate = social.warmthRate ?? 'moderate';
  const preferredRole = social.preferredRole ?? 'supporter';
  const conflictStyle = social.conflictStyle ?? 'diplomatic';
  const criticismResponse = social.criticismResponse ?? 'reflective';
  const boundaries = social.boundaries ?? 'healthy';
  const fragments: string[] = [];

  if (strangerDefault !== 'neutral') {
    fragments.push(`${humanizeToken(strangerDefault)} with strangers`);
  }

  if (warmthRate !== 'moderate') {
    fragments.push(
      warmthRate === 'fast'
        ? 'warms up quickly'
        : warmthRate === 'very-slow'
          ? 'very slow to warm up'
          : `${humanizeToken(warmthRate)} to warm up`
    );
  }

  if (preferredRole !== 'supporter') {
    const preferredRoleMap: Record<SocialPattern['preferredRole'], string> = {
      leader: 'takes the lead',
      supporter: 'supports others',
      advisor: 'acts as an advisor',
      loner: 'prefers to stay separate',
      entertainer: 'plays the entertainer',
      caretaker: 'slips into caretaker role',
    };
    fragments.push(preferredRoleMap[preferredRole]);
  }

  if (conflictStyle !== 'diplomatic') {
    const conflictStyleMap: Record<SocialPattern['conflictStyle'], string> = {
      confrontational: 'confronts conflict directly',
      diplomatic: 'handles conflict diplomatically',
      avoidant: 'avoids conflict',
      'passive-aggressive': 'turns conflict passive aggressive',
      collaborative: 'seeks collaborative solutions',
    };
    fragments.push(conflictStyleMap[conflictStyle]);
  }

  if (criticismResponse !== 'reflective') {
    const criticismResponseMap: Record<SocialPattern['criticismResponse'], string> = {
      defensive: 'gets defensive under criticism',
      reflective: 'reflects on criticism',
      dismissive: 'dismisses criticism',
      hurt: 'takes criticism personally',
      grateful: 'welcomes criticism',
    };
    fragments.push(criticismResponseMap[criticismResponse]);
  }

  if (boundaries !== 'healthy') {
    const boundariesMap: Record<SocialPattern['boundaries'], string> = {
      rigid: 'rigid boundaries',
      healthy: 'healthy boundaries',
      porous: 'porous boundaries',
      nonexistent: 'almost no boundaries',
    };
    fragments.push(boundariesMap[boundaries]);
  }

  if (fragments.length === 0) {
    return undefined;
  }

  return `Social: ${fragments.join(', ')}`;
}

function formatSpeechStyle(speech: SpeechStyle | undefined): string | undefined {
  if (!speech) {
    return undefined;
  }

  const vocabulary = speech.vocabulary ?? 'average';
  const sentenceStructure = speech.sentenceStructure ?? 'moderate';
  const formality = speech.formality ?? 'neutral';
  const humor = speech.humor ?? 'occasional';
  const expressiveness = speech.expressiveness ?? 'moderate';
  const directness = speech.directness ?? 'direct';
  const pace = speech.pace ?? 'moderate';
  const fragments: string[] = [];

  if (vocabulary !== 'average') {
    const vocabularyMap: Record<SpeechStyle['vocabulary'], string> = {
      simple: 'simple vocabulary',
      average: 'average vocabulary',
      educated: 'educated vocabulary',
      erudite: 'erudite vocabulary',
      archaic: 'archaic vocabulary',
    };
    fragments.push(vocabularyMap[vocabulary] ?? `${humanizeToken(vocabulary)} vocabulary`);
  }

  if (sentenceStructure !== 'moderate') {
    const sentenceStructureMap: Record<SpeechStyle['sentenceStructure'], string> = {
      terse: 'terse sentences',
      simple: 'simple sentences',
      moderate: 'moderate sentences',
      complex: 'complex sentences',
      elaborate: 'elaborate sentences',
    };
    fragments.push(
      sentenceStructureMap[sentenceStructure] ?? `${humanizeToken(sentenceStructure)} sentences`
    );
  }

  if (formality !== 'neutral') {
    const formalityMap: Record<SpeechStyle['formality'], string> = {
      casual: 'casual tone',
      neutral: 'neutral tone',
      formal: 'formal tone',
      ritualistic: 'ritualistic tone',
    };
    fragments.push(formalityMap[formality] ?? `${humanizeToken(formality)} tone`);
  }

  if (humor !== 'occasional' || speech.humorType) {
    if (humor === 'none') {
      fragments.push('no humor');
    } else if (speech.humorType) {
      if (humor === 'occasional') {
        fragments.push(`${humanizeToken(speech.humorType)} humor`);
      } else {
        fragments.push(`${humanizeToken(humor)} ${humanizeToken(speech.humorType)} humor`);
      }
    } else {
      fragments.push(`${humanizeToken(humor)} humor`);
    }
  }

  if (expressiveness !== 'moderate') {
    const expressivenessMap: Record<SpeechStyle['expressiveness'], string> = {
      stoic: 'stoic delivery',
      reserved: 'reserved delivery',
      moderate: 'moderate delivery',
      expressive: 'expressive delivery',
      dramatic: 'dramatic delivery',
    };
    fragments.push(
      expressivenessMap[expressiveness] ?? `${humanizeToken(expressiveness)} delivery`
    );
  }

  if (directness !== 'direct') {
    const directnessMap: Partial<Record<SpeechStyle['directness'], string>> = {
      blunt: 'blunt phrasing',
      tactful: 'tactful phrasing',
      indirect: 'indirect phrasing',
      evasive: 'evasive phrasing',
    };
    fragments.push(directnessMap[directness] ?? `${humanizeToken(directness)} phrasing`);
  }

  if (pace !== 'moderate') {
    const paceMap: Record<SpeechStyle['pace'], string> = {
      slow: 'slow pace',
      measured: 'measured pace',
      moderate: 'moderate pace',
      quick: 'quick pace',
      rapid: 'rapid pace',
    };
    fragments.push(paceMap[pace] ?? `${humanizeToken(pace)} pace`);
  }

  if (fragments.length === 0) {
    return undefined;
  }

  return `Speech: ${fragments.join(', ')}`;
}

function describeHumorType(humorType: NonNullable<SpeechStyle['humorType']>): string {
  switch (humorType) {
    case 'dry':
      return 'dry, understated';
    case 'sarcastic':
      return 'sarcastic';
    case 'witty':
      return 'witty, clever';
    case 'slapstick':
      return 'physical, absurd';
    case 'dark':
      return 'dark, morbid';
    case 'self-deprecating':
      return 'self-deprecating';
  }
}

/**
 * Build system-prompt level speech style directives for the LLM.
 */
export function buildSpeechStyleDirective(speech?: SpeechStyle): string | undefined {
  if (!speech) {
    return undefined;
  }

  const vocabulary = speech.vocabulary ?? 'average';
  const sentenceStructure = speech.sentenceStructure ?? 'moderate';
  const formality = speech.formality ?? 'neutral';
  const humor = speech.humor ?? 'occasional';
  const expressiveness = speech.expressiveness ?? 'moderate';
  const directness = speech.directness ?? 'direct';
  const pace = speech.pace ?? 'moderate';
  const directives: string[] = [];

  switch (vocabulary) {
    case 'simple':
      directives.push('Use simple, everyday words. Avoid complex vocabulary.');
      break;
    case 'educated':
      directives.push('Use educated, precise language with good grammar.');
      break;
    case 'erudite':
      directives.push('Use sophisticated, precise vocabulary. Employ literary and academic terms.');
      break;
    case 'archaic':
      directives.push('Use archaic, old-fashioned language. Thee, thou, henceforth.');
      break;
  }

  switch (formality) {
    case 'casual':
      directives.push('Speak casually. Use contractions, slang, and informal grammar.');
      break;
    case 'formal':
      directives.push('Speak formally. Use proper grammar and respectful language.');
      break;
    case 'ritualistic':
      directives.push(
        'Speak with ritualistic formality. Use titles, honorifics, and prescribed phrases.'
      );
      break;
  }

  switch (sentenceStructure) {
    case 'terse':
      directives.push('Use very short sentences. Fragments are fine. Get to the point.');
      break;
    case 'simple':
      directives.push('Use short, simple sentences.');
      break;
    case 'complex':
      directives.push('Use complex, multi-clause sentences.');
      break;
    case 'elaborate':
      directives.push(
        'Use flowing, multi-clause sentences with rich descriptive language.'
      );
      break;
  }

  if (humor !== 'occasional') {
    if (humor === 'none') {
      directives.push('Never use humor or jokes.');
    } else if (speech.humorType) {
      const humorType = describeHumorType(speech.humorType);

      switch (humor) {
        case 'rare':
          directives.push(`Rarely use ${humorType} humor.`);
          break;
        case 'frequent':
          directives.push(`Frequently use ${humorType} humor.`);
          break;
        case 'constant':
          directives.push(`Always use ${humorType} humor.`);
          break;
      }
    } else {
      switch (humor) {
        case 'rare':
          directives.push('Rarely use humor.');
          break;
        case 'frequent':
          directives.push('Frequently use humor.');
          break;
        case 'constant':
          directives.push('Always be humorous.');
          break;
      }
    }
  }

  switch (pace) {
    case 'slow':
      directives.push('Speak slowly and deliberately. Take your time with each word.');
      break;
    case 'measured':
      directives.push('Speak at a measured, unhurried pace.');
      break;
    case 'quick':
      directives.push('Speak quickly, as if eager.');
      break;
    case 'rapid':
      directives.push('Speak rapidly, as if in a rush. Short bursts.');
      break;
  }

  switch (expressiveness) {
    case 'stoic':
      directives.push(
        'Show almost no emotion in speech. Flat, matter-of-fact delivery.'
      );
      break;
    case 'reserved':
      directives.push('Keep emotional expression minimal and controlled.');
      break;
    case 'expressive':
      directives.push('Be emotionally expressive in speech.');
      break;
    case 'dramatic':
      directives.push(
        'Be highly expressive. Use exclamations, emphasis, and emotional language.'
      );
      break;
  }

  switch (directness) {
    case 'blunt':
      directives.push('Be blunt and direct. No softening.');
      break;
    case 'tactful':
      directives.push('Be tactful and diplomatic in wording.');
      break;
    case 'indirect':
      directives.push('Speak indirectly. Imply rather than state.');
      break;
    case 'evasive':
      directives.push('Be evasive. Deflect and avoid committing.');
      break;
  }

  if (directives.length === 0) {
    return undefined;
  }

  return directives.join(' ');
}

/**
 * Build the system prompt for NPC cognition, with optional speech-style enforcement.
 */
export function buildSystemPrompt(speech?: SpeechStyle): string {
  const base = [
    'You decide how an NPC should act based on recent events and their personality.',
    'If no action is appropriate, respond with NO_ACTION.',
    'Otherwise, decide the NPC\'s next spoken response, optional self-directed action, and emotional tone.',
    'Keep dialogue concise (max 20 words). Do not narrate the player\'s state or other NPCs\' actions.',
  ];

  const directive = buildSpeechStyleDirective(speech);
  if (directive) {
    base.push('');
    base.push('Speech style requirements:');
    base.push(directive);
  }

  return base.join('\n');
}

function formatStressResponse(response: StressBehavior['primary']): string {
  const responseMap: Record<StressBehavior['primary'], string> = {
    fight: 'fights',
    flight: 'flees',
    freeze: 'freezes',
    fawn: 'fawns',
  };

  return responseMap[response] ?? humanizeToken(response);
}

function formatStressBehavior(stress: StressBehavior | undefined): string | undefined {
  if (!stress) {
    return undefined;
  }

  const primary = stress.primary ?? 'freeze';
  const threshold = stress.threshold ?? 0.5;
  const recoveryRate = stress.recoveryRate ?? 'moderate';
  const response = stress.secondary
    ? `${formatStressResponse(primary)} then ${formatStressResponse(stress.secondary)}`
    : formatStressResponse(primary);

  return `Under stress: ${response}, ${formatStressThreshold(
    threshold
  )} threshold, ${humanizeToken(recoveryRate)} recovery`;
}

export const NPC_DECISION_SYSTEM_PROMPT = buildSystemPrompt();

/**
 * Builds an instruction block that requests structured JSON output
 * with dialogue, action, and emotion fields.
 */
export function buildStructuredOutputInstruction(): string {
  return [
    'Respond ONLY with a JSON object in this exact format (no markdown fences, no extra text):',
    '{',
    '  "dialogue": "What the NPC says aloud (empty string if silent)",',
    '  "action": "A brief physical action or gesture, or null if none",',
    '  "emotion": "The NPC\'s current emotional state, or null if neutral"',
    '}',
    '',
    'Rules:',
    '- dialogue: The spoken words only. No action descriptions or stage directions.',
    '- action: A short third-person physical description of this NPC only (for example, "crosses her arms" or "glances away"). Null if no notable action.',
    '- emotion: A single word or short phrase for the emotional state (for example, "amused", "nervous", or "coldly irritated"). Null if neutral.',
    '- Do not describe the player\'s internal state or other NPCs\' actions.',
    '- Do NOT wrap the response in markdown code fences.',
    '- Respond with NO_ACTION as a plain string (not JSON) if the NPC would not react.',
  ].join('\n');
}

export function buildNpcCognitionPrompt(
  perception: PerceptionContext,
  state: NpcRuntimeState,
  profile: CharacterProfile,
  modifiers?: PersonalityModifiers,
  contextExtras?: CognitionContextExtras
): string {
  const lines: string[] = [];
  const personalityMap = profile.personalityMap;

  lines.push(`NPC: ${profile.name ?? state.npcId}`);
  const dimensions = formatDimensions(personalityMap?.dimensions);
  if (dimensions) {
    lines.push(dimensions);
  }

  if (personalityMap?.traits?.length) {
    lines.push(`Traits: ${personalityMap.traits.join(', ')}`);
  }

  const values = formatValues(personalityMap?.values);
  if (values) {
    lines.push(values);
  }

  const fears = formatFears(personalityMap?.fears);
  if (fears) {
    lines.push(fears);
  }

  const socialPatterns = formatSocialPatterns(personalityMap?.social);
  if (socialPatterns) {
    lines.push(socialPatterns);
  }

  const speechStyle = formatSpeechStyle(personalityMap?.speech);
  if (speechStyle) {
    lines.push(speechStyle);
  }

  const emotionalBaseline = formatEmotionalBaseline(personalityMap?.emotionalBaseline);
  if (emotionalBaseline) {
    lines.push(emotionalBaseline);
  }

  const stressBehavior = formatStressBehavior(personalityMap?.stress);
  if (stressBehavior) {
    lines.push(stressBehavior);
  }

  if (profile.summary) {
    lines.push(`Summary: ${profile.summary}`);
  }
  if (profile.backstory) {
    lines.push(`Backstory: ${profile.backstory.slice(0, 200)}`);
  }

  if (contextExtras?.startingScenario) {
    lines.push(`Scenario: ${contextExtras.startingScenario}`);
  }

  const playerRelationship = getPlayerRelationship(contextExtras?.relationships);
  if (contextExtras?.playerName || contextExtras?.playerDescription || playerRelationship) {
    lines.push('RELATIONSHIP WITH PLAYER:');

    const playerIdentity: string[] = [];
    if (contextExtras?.playerName) {
      playerIdentity.push(`The player's name is ${contextExtras.playerName}.`);
    }
    if (contextExtras?.playerDescription) {
      playerIdentity.push(contextExtras.playerDescription);
    }
    if (playerIdentity.length > 0) {
      lines.push(playerIdentity.join(' '));
    }

    if (playerRelationship) {
      lines.push(
        `Your relationship: ${playerRelationship.relationshipType} (Trust: ${formatAffinityLabel(
          playerRelationship.affinity.trust
        )}, Fondness: ${formatAffinityLabel(
          playerRelationship.affinity.fondness
        )}, Fear: ${formatAffinityLabel(playerRelationship.affinity.fear)})`
      );
    }
  }

  lines.push('Recent events:');
  if (perception.relevantEvents.length === 0) {
    lines.push('- None');
  } else {
    perception.relevantEvents.slice(-5).forEach((event) => {
      const actorId = getStringField(event, 'actorId') ?? 'unknown';
      const actorLabel = formatActorLabel(actorId, contextExtras);
      if (event.type === 'SPOKE') {
        const content = getStringField(event, 'content');
        if (content) {
          lines.push(`- ${actorLabel} said: "${content}"`);
        } else {
          lines.push(`- ${actorLabel} spoke`);
        }
        return;
      }

      lines.push(`- ${event.type} from ${actorLabel}`);
    });
  }

  if (modifiers && !isDefaultModifiers(modifiers)) {
    const behavioralFragments: string[] = [];

    if (modifiers.urgency !== 'normal') {
      behavioralFragments.push(`urgency ${modifiers.urgency}`);
    }

    if (modifiers.contextNotes.length > 0) {
      behavioralFragments.push(modifiers.contextNotes.join(', '));
    }

    if (behavioralFragments.length > 0) {
      lines.push(`Behavioral context: ${behavioralFragments.join(', ')}`);
    }
  }

  lines.push(
    modifiers?.urgency === 'critical'
      ? 'Instruction: Respond urgently and stay in character.'
      : 'Instruction: Decide the NPC\'s next response in character.'
  );
  lines.push(buildStructuredOutputInstruction());

  return lines.join('\n');
}

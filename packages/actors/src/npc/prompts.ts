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
import { getRecord, getRecordOptional } from '@arcagentic/schemas';
import type { PersonalityModifiers } from './personality-modifiers.js';
import type {
  CognitionContextExtras,
  EpisodicMemorySummary,
  NpcRelationshipContext,
  NpcRuntimeState,
  PerceptionContext,
} from './types.js';
import {
  buildAppealPromptSection,
  findTriggeredAppealTags,
} from './appeal-tags.js';
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

function ensureSentence(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function joinNaturalList(items: string[]): string {
  if (items.length === 0) {
    return '';
  }

  if (items.length === 1) {
    return items[0] ?? '';
  }

  if (items.length === 2) {
    const first = items[0] ?? '';
    const second = items[1] ?? '';
    return `${first} and ${second}`;
  }

  const last = items[items.length - 1] ?? '';
  return `${items.slice(0, -1).join(', ')}, and ${last}`;
}

function formatStressThreshold(threshold: number): string {
  if (threshold < 0.3) return 'rattles easily';
  if (threshold > 0.7) return 'takes a lot to rattle';
  return 'has a moderate stress threshold';
}

function formatMoodStability(stability: number): string {
  if (stability < 0.3) return 'volatile';
  if (stability > 0.7) return 'steady';
  return 'fairly even';
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

export function renderProximityDescription(proximity: string): string {
  switch (proximity) {
    case 'intimate':
      return 'The player is in direct physical contact or immediate physical closeness with you.';
    case 'close':
      return 'The player is within arm\'s reach.';
    case 'near':
      return 'The player is nearby, within ordinary conversation distance.';
    case 'distant':
      return 'The player is far away, barely visible or audible.';
    default:
      return '';
  }
}

function getPlayerRelationship(
  relationships?: CognitionContextExtras['relationships']
): NpcRelationshipContext | undefined {
  if (!relationships) {
    return undefined;
  }

  const directPlayerRelationship = relationships?.['player'];
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

function isPlayerActorId(actorId: string | undefined): boolean {
  if (!actorId) {
    return false;
  }

  return actorId === 'player' || actorId.startsWith('player:');
}

function getLatestPlayerSpokeContent(perception: PerceptionContext): string {
  for (let index = perception.relevantEvents.length - 1; index >= 0; index -= 1) {
    const event = perception.relevantEvents.at(index);
    if (event?.type !== 'SPOKE') {
      continue;
    }

    const actorId = getStringField(event, 'actorId');
    if (!isPlayerActorId(actorId)) {
      continue;
    }

    return getStringField(event, 'content') ?? '';
  }

  return '';
}

function hasPlayerSpokeEvent(perception: PerceptionContext): boolean {
  return perception.relevantEvents.some(
    (event) => event.type === 'SPOKE' && isPlayerActorId(getStringField(event, 'actorId'))
  );
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
    .map((value) => value.value);

  return joinNaturalList(renderedValues);
}

function formatFears(fears: Fear[] | undefined): string | undefined {
  if (!fears?.length) {
    return undefined;
  }

  const renderedFears = [...fears]
    .sort((left, right) => right.intensity - left.intensity)
    .slice(0, 2)
    .map((fear) => fear.specific.trim());

  return joinNaturalList(renderedFears);
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
      const score = getRecordOptional(dimensions, dimension);
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

  return joinNaturalList(renderedDimensions);
}

function formatEmotionalBaseline(emotional: EmotionalState | undefined): string | undefined {
  if (!emotional) {
    return undefined;
  }

  const moodBaseline = emotional.moodBaseline ?? 'trust';
  const mood = getEmotionAdjective(moodBaseline);
  const stability = formatMoodStability(emotional.moodStability ?? 0.5);
  const currentEmotion = `${emotional.intensity ?? 'mild'} ${humanizeToken(
    emotional.current ?? 'anticipation'
  )}`;

  return ensureSentence(
    `Emotional baseline: Usually ${mood} with a ${stability} emotional center, currently ${currentEmotion}`
  );
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
    fragments.push(getRecord(preferredRoleMap, preferredRole));
  }

  if (conflictStyle !== 'diplomatic') {
    const conflictStyleMap: Record<SocialPattern['conflictStyle'], string> = {
      confrontational: 'confronts conflict directly',
      diplomatic: 'handles conflict diplomatically',
      avoidant: 'avoids conflict',
      'passive-aggressive': 'turns conflict passive aggressive',
      collaborative: 'seeks collaborative solutions',
    };
    fragments.push(getRecord(conflictStyleMap, conflictStyle));
  }

  if (criticismResponse !== 'reflective') {
    const criticismResponseMap: Record<SocialPattern['criticismResponse'], string> = {
      defensive: 'gets defensive under criticism',
      reflective: 'reflects on criticism',
      dismissive: 'dismisses criticism',
      hurt: 'takes criticism personally',
      grateful: 'welcomes criticism',
    };
    fragments.push(getRecord(criticismResponseMap, criticismResponse));
  }

  if (boundaries !== 'healthy') {
    const boundariesMap: Record<SocialPattern['boundaries'], string> = {
      rigid: 'rigid boundaries',
      healthy: 'healthy boundaries',
      porous: 'porous boundaries',
      nonexistent: 'almost no boundaries',
    };
    fragments.push(getRecord(boundariesMap, boundaries));
  }

  if (fragments.length === 0) {
    return undefined;
  }

  return ensureSentence(`Social patterns: ${fragments.join(', ')}`);
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
    fragments.push(getRecord(vocabularyMap, vocabulary));
  }

  if (sentenceStructure !== 'moderate') {
    const sentenceStructureMap: Record<SpeechStyle['sentenceStructure'], string> = {
      terse: 'terse sentences',
      simple: 'simple sentences',
      moderate: 'moderate sentences',
      complex: 'complex sentences',
      elaborate: 'elaborate sentences',
    };
    fragments.push(getRecord(sentenceStructureMap, sentenceStructure));
  }

  if (formality !== 'neutral') {
    const formalityMap: Record<SpeechStyle['formality'], string> = {
      casual: 'casual tone',
      neutral: 'neutral tone',
      formal: 'formal tone',
      ritualistic: 'ritualistic tone',
    };
    fragments.push(getRecord(formalityMap, formality));
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
    fragments.push(getRecord(expressivenessMap, expressiveness));
  }

  if (directness !== 'direct') {
    const directnessMap: Partial<Record<SpeechStyle['directness'], string>> = {
      blunt: 'blunt phrasing',
      tactful: 'tactful phrasing',
      indirect: 'indirect phrasing',
      evasive: 'evasive phrasing',
    };
    fragments.push(
      getRecordOptional(directnessMap, directness) ?? `${humanizeToken(directness)} phrasing`
    );
  }

  if (pace !== 'moderate') {
    const paceMap: Record<SpeechStyle['pace'], string> = {
      slow: 'slow pace',
      measured: 'measured pace',
      moderate: 'moderate pace',
      quick: 'quick pace',
      rapid: 'rapid pace',
    };
    fragments.push(getRecord(paceMap, pace));
  }

  if (fragments.length === 0) {
    return undefined;
  }

  return joinNaturalList(fragments);
}

function buildCharacterSummary(
  npcName: string,
  personalityMap: CharacterProfile['personalityMap'] | undefined
): string | undefined {
  if (!personalityMap) {
    return undefined;
  }

  const summarySentences: string[] = [];
  const dimensions = formatDimensions(personalityMap.dimensions);
  const traits = personalityMap.traits?.slice(0, 3).map((trait) => humanizeToken(trait)) ?? [];
  const values = formatValues(personalityMap.values);
  const fears = formatFears(personalityMap.fears);
  const speechStyle = formatSpeechStyle(personalityMap.speech);

  if (dimensions && traits.length > 0) {
    summarySentences.push(
      `${npcName} is ${dimensions}, with ${joinNaturalList(traits)} instincts`
    );
  } else if (dimensions) {
    summarySentences.push(`${npcName} is ${dimensions}`);
  } else if (traits.length > 0) {
    summarySentences.push(`${npcName} comes across as ${joinNaturalList(traits)}`);
  }

  if (values) {
    summarySentences.push(`What matters most to ${npcName} is ${values}`);
  }

  if (fears) {
    summarySentences.push(`They fear ${fears}`);
  }

  if (speechStyle) {
    summarySentences.push(`They speak with ${speechStyle}`);
  }

  if (summarySentences.length === 0) {
    return undefined;
  }

  return `Character: ${summarySentences.map((sentence) => ensureSentence(sentence)).join(' ')}`;
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
    'You are inhabiting a character in a living world. You have your own wants, feelings, and momentum.',
    'Choose what you do next from your own point of view, based on who you are, what you notice, and what matters right now.',
    'You are not obligated to answer or perform. If nothing truly calls for action, continue what you were doing or respond with NO_ACTION.',
    'If you are busy with your own activity and the player is not addressing you, you may keep doing what you are doing without speaking.',
    'Produce at most one coherent beat for this turn.',
    'Do not control the player or invent the player\'s thoughts, words, or actions.',
    'Stay grounded in what you have actually perceived.',
    'Favor concrete, physically plausible behavior over abstract explanation.',
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
    fight: 'fight',
    flight: 'flee',
    freeze: 'freeze',
    fawn: 'fawn',
  };

  return getRecord(responseMap, response);
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

  return ensureSentence(
    `Stress behavior: Under pressure, tends to ${response}, ${formatStressThreshold(
      threshold
    )}, and recovers ${humanizeToken(recoveryRate)}`
  );
}

export const NPC_DECISION_SYSTEM_PROMPT = buildSystemPrompt();

/**
 * Builds an instruction block that requests structured JSON output
 * for the NPC's next scene beat.
 */
export function buildStructuredOutputInstruction(): string {
  return [
    'You MUST respond with valid JSON matching exactly this structure:',
    '{',
    '  "dialogue": "What you say aloud - keep it natural, concise, and in character. Avoid restating what was just said",',
    '  "physicalAction": "A brief outward action or gesture the player can observe",',
    '  "observation": "What you notice about the scene, the player, or other characters",',
    '  "internalState": "A short note about your current feeling or thought shift",',
    '  "sensoryDetail": "A relevant smell, sound, touch, temperature, or sensory cue you notice",',
    '  "emotion": "A short emotional label or phrase"',
    '}',
    '',
    'Rules:',
    '- "dialogue" is spoken text only. Keep it natural, concise, and in character. Do not include action descriptions or simply repeat what was just said.',
    '- "physicalAction" is outward, player-observable behavior. Keep it to one concrete gesture or movement.',
    '- "observation" is what you personally notice. Do not narrate what others are thinking.',
    '- "internalState" is brief and private. One short sentence about how you feel.',
    '- "sensoryDetail" is optional. Include only when something is genuinely salient to you.',
    '- "emotion" is a short label like "amused", "wary", "curious".',
    '- All fields except "dialogue" are optional. Omit fields that do not apply rather than filling them with generic text.',
    '- If you are occupied with your own activity and do not have a reason to respond, it is valid to keep doing what you are doing. That ongoing activity may be narrated later as ambient scene detail.',
    '- If you would not react at all, respond with the plain text: NO_ACTION',
  ].join('\n');
}

export function buildNpcCognitionPrompt(
  perception: PerceptionContext,
  state: NpcRuntimeState,
  profile: CharacterProfile,
  modifiers?: PersonalityModifiers,
  contextExtras?: CognitionContextExtras,
  episodicMemories?: EpisodicMemorySummary[]
): string {
  const lines: string[] = [];
  const npcName = profile.name ?? state.npcId;
  const personalityMap = profile.personalityMap;
  const hasNarratorHistory = (perception.narratorHistory ?? []).some(
    (entry) => entry.trim().length > 0
  );

  lines.push(`NPC: ${npcName}`);
  const characterSummary = buildCharacterSummary(npcName, personalityMap);
  if (characterSummary) {
    lines.push(characterSummary);
  }

  const socialPatterns = formatSocialPatterns(personalityMap?.social);
  if (socialPatterns) {
    lines.push(socialPatterns);
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
    lines.push(`Backstory: ${profile.backstory}`);
  }

  lines.push('## Current Situation');

  if (contextExtras?.locationName) {
    const locationLine = contextExtras.locationDescription
      ? `You are at ${contextExtras.locationName}. ${ensureSentence(contextExtras.locationDescription)}`
      : `You are at ${contextExtras.locationName}.`;
    lines.push(locationLine);
  }

  if (contextExtras?.currentActivity) {
    lines.push(
      `You are currently: ${contextExtras.currentActivity.description} (${contextExtras.currentActivity.engagement})`
    );

    if (
      contextExtras.currentActivity.engagement === 'focused' ||
      contextExtras.currentActivity.engagement === 'absorbed'
    ) {
      lines.push('You are deeply engaged in this and would need a good reason to stop.');
    }
  }

  if (contextExtras?.interruptible === false) {
    lines.push('You cannot be interrupted right now.');
  }

  if (contextExtras?.playerProximity) {
    const proximityDescription = renderProximityDescription(contextExtras.playerProximity);
    if (proximityDescription) {
      lines.push(proximityDescription);
    }

    if (
      contextExtras.playerProximity === 'close' ||
      contextExtras.playerProximity === 'intimate'
    ) {
      lines.push(
        'Physical closeness is relevant to this scene. Be aware of physical sensations, warmth, touch, and the intimacy of the moment when deciding your response.'
      );
    }
  }

  if (hasPlayerSpokeEvent(perception)) {
    if (contextExtras?.playerAddressedDirectly === true) {
      lines.push('The player is speaking directly to you.');
    } else if (contextExtras?.playerAddressedDirectly === false) {
      lines.push(
        'You overheard the player speaking, but they were not addressing you specifically.'
      );
    }
  }

  if (contextExtras?.nearbyNpcSummaries?.length) {
    lines.push('Others nearby:');
    contextExtras.nearbyNpcSummaries.forEach((summary) => {
      lines.push(`- ${summary}`);
    });
  }

  lines.push('[Time: not yet tracked]');

  if (!hasNarratorHistory && contextExtras?.startingScenario) {
    lines.push('');
    lines.push('## Setting');
    lines.push(contextExtras.startingScenario);
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

  const rememberedMemories = (episodicMemories ?? [])
    .map((memory) => memory.content.replace(/\s+/g, ' ').trim())
    .filter((memory) => memory.length > 0)
    .slice(0, 5);

  if (rememberedMemories.length > 0) {
    lines.push('Things you remember from past encounters:');
    rememberedMemories.forEach((memory) => {
      lines.push(`- ${memory}`);
    });
    lines.push(
      "Let these memories inform your behavior naturally. Don't reference them as 'memories' - they're just things you know."
    );
  }

  const narratorHistory = (perception.narratorHistory ?? [])
    .map((entry) => entry.replace(/\s+/g, ' ').trim())
    .filter((entry) => entry.length > 0)
    .slice(0, 5);

  if (narratorHistory.length > 0) {
    lines.push('## Recent Scene Context');
    lines.push(
      'The following is scene narration from your surroundings. Use it for atmospheric grounding. It reflects what has been happening around you recently.'
    );
    narratorHistory.forEach((entry) => {
      lines.push(entry);
    });
  }

  const recentEventDescriptions: string[] = [];
  lines.push('Recent events:');
  if (perception.relevantEvents.length === 0) {
    lines.push('- None');
  } else {
    perception.relevantEvents.slice(-10).forEach((event) => {
      const actorId = getStringField(event, 'actorId') ?? 'unknown';
      const actorLabel = formatActorLabel(actorId, contextExtras);
      if (event.type === 'SPOKE') {
        const content = getStringField(event, 'content');
        if (content) {
          const description = `${actorLabel} said: "${content}"`;
          recentEventDescriptions.push(description);
          lines.push(`- ${description}`);
        } else {
          const description = `${actorLabel} spoke`;
          recentEventDescriptions.push(description);
          lines.push(`- ${description}`);
        }
        return;
      }

      const description = `${event.type} from ${actorLabel}`;
      recentEventDescriptions.push(description);
      lines.push(`- ${description}`);
    });
  }

  if (contextExtras?.playerAppealTags?.length) {
    const triggeredAppealTags = findTriggeredAppealTags(
      getLatestPlayerSpokeContent(perception),
      recentEventDescriptions,
      contextExtras.playerAppealTags,
    );
    const appealPromptSection = buildAppealPromptSection(
      triggeredAppealTags,
      profile,
      npcName,
    );

    if (appealPromptSection) {
      lines.push(appealPromptSection);
    }
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

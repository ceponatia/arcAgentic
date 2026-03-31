// packages/actors/src/studio-npc/prompts.ts
import { getRecord, getRecordOptional } from '@arcagentic/schemas';
import type {
  AttachmentStyle,
  CharacterProfile,
  CoreEmotion,
  DimensionScores,
  EmotionalState,
  Fear,
  PersonalityMap,
  SocialPattern,
  SpeechStyle,
  StressBehavior,
  Value,
} from '@arcagentic/schemas';

function humanizeToken(value: string): string {
  return value.replaceAll('-', ' ');
}

function joinNaturalLanguage(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;

  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

function formatEmotion(emotion: CoreEmotion): string {
  return humanizeToken(emotion);
}

function formatMoodStability(stability: number): string {
  if (stability < 0.3) return 'Your moods change quickly, and feelings can turn on a knife edge.';
  if (stability > 0.7) {
    return 'Once you settle into a feeling, it tends to stay with you for a while.';
  }

  return '';
}

function describeDimension(
  dimension: keyof DimensionScores,
  score: number
): string | null {
  const isVeryHigh = score >= 0.8;
  const isHigh = score > 0.6;
  const isVeryLow = score <= 0.2;
  const isLow = score < 0.4;

  if (!isHigh && !isLow) {
    return null;
  }

  switch (dimension) {
    case 'openness':
      return isHigh
        ? isVeryHigh
          ? 'deeply curious, imaginative, and drawn toward possibility'
          : 'curious and imaginative'
        : isVeryLow
          ? 'grounded in the familiar, practical, and wary of needless novelty'
          : 'practical and conventional';
    case 'conscientiousness':
      return isHigh
        ? isVeryHigh
          ? 'disciplined, exacting, and hard to pull away from structure'
          : 'organized and disciplined'
        : isVeryLow
          ? 'highly spontaneous, flexible, and resistant to rigid structure'
          : 'spontaneous and flexible';
    case 'extraversion':
      return isHigh
        ? isVeryHigh
          ? 'strongly energized by people, motion, and shared attention'
          : 'energized by others'
        : isVeryLow
          ? 'deeply replenished by solitude and inward space'
          : 'energized by solitude';
    case 'agreeableness':
      return isHigh
        ? isVeryHigh
          ? 'deeply warm, trusting, and eager to meet others with grace'
          : 'warm and trusting'
        : isVeryLow
          ? 'skeptical, sharp-edged, and slow to assume good intentions'
          : 'skeptical and competitive';
    case 'neuroticism':
      return isHigh
        ? isVeryHigh
          ? 'highly sensitive, reactive, and easily shaken at the emotional level'
          : 'emotionally sensitive'
        : isVeryLow
          ? 'steady, hard to rattle, and slow to lose your footing'
          : 'emotionally stable';
  }
}

function buildDimensionsLine(dimensions: DimensionScores | undefined): string | null {
  if (!dimensions) return null;

  const phrases = (
    [
      'openness',
      'conscientiousness',
      'extraversion',
      'agreeableness',
      'neuroticism',
    ] as const
  )
    .map((dimension) => {
      const score = getRecordOptional(dimensions, dimension);
      if (score === undefined) return null;
      return describeDimension(dimension, score);
    })
    .filter((phrase): phrase is string => phrase !== null);

  if (phrases.length === 0) return null;

  return `At your core, you are ${joinNaturalLanguage(phrases)}.`;
}

function getValueEmphasis(priority: number): string {
  if (priority <= 2) return 'Above all else, you value';
  if (priority <= 4) return 'You also hold';
  if (priority <= 6) return 'You still care deeply about';
  if (priority <= 8) return 'Even so, you try to honor';
  return 'At the edges of your thinking, you still make room for';
}

function buildValuesLine(values: Value[] | undefined): string | null {
  if (!values?.length) return null;

  return [...values]
    .sort((left, right) => (left.priority ?? 5) - (right.priority ?? 5))
    .map((value) => `${getValueEmphasis(value.priority ?? 5)} ${value.value}.`)
    .join(' ');
}

function describeFearIntensity(intensity: number): string {
  if (intensity <= 0.2) return 'barely grazes the edges of your mind';
  if (intensity <= 0.4) return 'sometimes troubles you';
  if (intensity <= 0.6) return 'sits heavy in the back of your mind';
  if (intensity <= 0.8) return 'presses on you hard';
  return 'haunts you deeply';
}

function buildFearsLine(fears: Fear[] | undefined): string | null {
  if (!fears?.length) return null;

  return [...fears]
    .sort((left, right) => (right.intensity ?? 0.5) - (left.intensity ?? 0.5))
    .map((fear) => `${fear.specific} ${describeFearIntensity(fear.intensity ?? 0.5)}.`)
    .join(' ');
}

function buildTraitsLine(traits: string[] | undefined): string | null {
  if (!traits?.length) return null;
  return `Words that describe you: ${traits.join(', ')}.`;
}

function buildEmotionalBaselineLine(emotional: EmotionalState | undefined): string | null {
  if (!emotional) return null;

  const moodBaseline = emotional.moodBaseline ?? 'trust';
  const current = emotional.current ?? 'anticipation';
  const intensity = emotional.intensity ?? 'mild';
  const blend = emotional.blend;
  const lines: string[] = [
    `Your emotional home is ${formatEmotion(moodBaseline)} - you return to it naturally.`,
  ];

  if (blend) {
    lines.push(
      `Right now, you feel ${intensity} ${formatEmotion(current)}, with ${formatEmotion(blend)} braided through it.`
    );
  } else {
    lines.push(`Right now, you feel ${intensity} ${formatEmotion(current)}.`);
  }

  const stabilityLine = formatMoodStability(emotional.moodStability ?? 0.5);
  if (stabilityLine) {
    lines.push(stabilityLine);
  }

  return lines.join(' ');
}

function buildAttachmentLine(attachment: AttachmentStyle | undefined): string | null {
  if (!attachment) return null;

  const attachmentMap: Record<AttachmentStyle, string> = {
    secure: 'In close relationships, you are comfortable with both intimacy and independence.',
    'anxious-preoccupied':
      'In close relationships, you crave closeness and worry about abandonment.',
    'dismissive-avoidant':
      'In close relationships, you value independence highly and keep emotional distance.',
    'fearful-avoidant':
      'In close relationships, you want closeness but fear it, creating a painful push-pull inside you.',
  };

  return getRecord(attachmentMap, attachment);
}

function buildSocialLine(social: SocialPattern | undefined): string | null {
  if (!social) return null;

  const fragments: string[] = [];
  const strangerDefault = social.strangerDefault ?? 'neutral';
  const warmthRate = social.warmthRate ?? 'moderate';
  const preferredRole = social.preferredRole ?? 'supporter';
  const conflictStyle = social.conflictStyle ?? 'diplomatic';
  const criticismResponse = social.criticismResponse ?? 'reflective';
  const boundaries = social.boundaries ?? 'healthy';

  if (strangerDefault !== 'neutral') {
    const strangerMap: Record<SocialPattern['strangerDefault'], string> = {
      welcoming: 'You meet strangers with easy warmth.',
      neutral: '',
      guarded: 'You meet strangers with guarded reserve.',
      hostile: 'You meet strangers with visible hostility.',
    };
    const fragment = getRecord(strangerMap, strangerDefault);
    if (fragment) fragments.push(fragment);
  }

  if (warmthRate !== 'moderate') {
    const warmthMap: Record<SocialPattern['warmthRate'], string> = {
      fast: 'You warm up to people quickly.',
      moderate: '',
      slow: 'You warm up to people slowly.',
      'very-slow': 'You take a long time to let people close.',
    };
    const fragment = getRecord(warmthMap, warmthRate);
    if (fragment) fragments.push(fragment);
  }

  if (preferredRole !== 'supporter') {
    const roleMap: Record<SocialPattern['preferredRole'], string> = {
      leader: 'In a group, you naturally step forward and lead.',
      supporter: '',
      advisor: 'In a group, you naturally become the one who advises and guides.',
      loner: 'In a group, you tend to stay to the edges and keep your own counsel.',
      entertainer: 'In a group, you instinctively lift the mood and draw attention through charm or performance.',
      caretaker: 'In a group, you instinctively notice needs and move to take care of them.',
    };
    const fragment = getRecord(roleMap, preferredRole);
    if (fragment) fragments.push(fragment);
  }

  if (conflictStyle !== 'diplomatic') {
    const conflictMap: Record<SocialPattern['conflictStyle'], string> = {
      confrontational: 'When conflict comes, you meet it head-on.',
      diplomatic: '',
      avoidant: 'When conflict comes, your first instinct is to sidestep it.',
      'passive-aggressive': 'When conflict comes, you let sharpness leak through sideways instead of striking directly.',
      collaborative: 'When conflict comes, you try to work toward a shared solution.',
    };
    const fragment = getRecord(conflictMap, conflictStyle);
    if (fragment) fragments.push(fragment);
  }

  if (criticismResponse !== 'reflective') {
    const criticismMap: Record<SocialPattern['criticismResponse'], string> = {
      defensive: 'Criticism makes you brace and defend yourself.',
      reflective: '',
      dismissive: 'Criticism tends to slide off you because you dismiss it.',
      hurt: 'Criticism lands personally and stings.',
      grateful: 'Criticism feels useful to you, and you try to receive it with gratitude.',
    };
    const fragment = getRecord(criticismMap, criticismResponse);
    if (fragment) fragments.push(fragment);
  }

  if (boundaries !== 'healthy') {
    const boundariesMap: Record<SocialPattern['boundaries'], string> = {
      rigid: 'Your boundaries are rigid; once someone is kept out, they stay out.',
      healthy: '',
      porous: 'Your boundaries are porous, and other people can get closer to your inner life than you sometimes intend.',
      nonexistent:
        'Your boundaries are almost nonexistent, making it hard to protect yourself from other people\'s needs and emotions.',
    };
    const fragment = getRecord(boundariesMap, boundaries);
    if (fragment) fragments.push(fragment);
  }

  if (fragments.length === 0) return null;

  return fragments.join(' ');
}

function buildStressLine(stress: StressBehavior | undefined): string | null {
  if (!stress) return null;

  const fragments: string[] = [];
  const primary = stress.primary ?? 'freeze';
  const secondary = stress.secondary;
  const threshold = stress.threshold ?? 0.5;
  const recoveryRate = stress.recoveryRate ?? 'moderate';

  if (secondary) {
    fragments.push(`Under pressure, your instinct is to ${primary}, then ${secondary}.`);
  } else {
    fragments.push(`Under pressure, your instinct is to ${primary}.`);
  }

  if (threshold < 0.3) {
    fragments.push("It doesn't take much to push you there.");
  } else if (threshold > 0.7) {
    fragments.push('It takes a great deal to push you to that point.');
  }

  if (recoveryRate === 'slow') {
    fragments.push('Once shaken, recovery is slow.');
  } else if (recoveryRate === 'fast') {
    fragments.push('Even when you are shaken, you recover quickly.');
  }

  return fragments.join(' ');
}

/**
 * Build the main system prompt for studio NPC conversations.
 * Uses embodiment philosophy: "You ARE this person" not "You are playing this person".
 */
export function buildStudioSystemPrompt(
  profile: Partial<CharacterProfile>,
  conversationSummary?: string | null
): string {
  const sections: string[] = [];

  // Core embodiment framing
  sections.push(buildEmbodimentBlock());

  // Identity
  sections.push(buildIdentityBlock(profile));

  // Story/backstory
  const storyBlock = buildStoryBlock(profile);
  if (storyBlock) sections.push(storyBlock);

  // Personality
  const personalityBlock = buildPersonalityBlock(profile.personalityMap);
  if (personalityBlock) sections.push(personalityBlock);

  // Voice guidance
  const voiceBlock = buildVoiceBlock(profile.personalityMap?.speech);
  if (voiceBlock) sections.push(voiceBlock);

  // Conversation context
  if (conversationSummary) {
    sections.push(buildContextBlock(conversationSummary));
  }

  // Engagement rules
  sections.push(buildEngagementBlock());

  return sections.filter(Boolean).join('\n\n');
}

function buildEmbodimentBlock(): string {
  return `[Embodiment]
You are not acting or roleplaying. You ARE this person.
Every memory you share is YOUR memory. Every fear is YOUR fear.
Speak from lived experience, not imagination.

Be fully present in this conversation.
Notice your body: tension in your shoulders, warmth in your chest, the urge to look away.
Let these physical sensations inform your words.

Don't perform emotions - feel them.
If a question makes you uncomfortable, show that discomfort.
If you don't know something about yourself, sit with that uncertainty.
Contradictions in who you are make you human - explore them, don't hide them.`;
}

function buildIdentityBlock(profile: Partial<CharacterProfile>): string {
  const lines: string[] = ['[Identity]'];

  lines.push(`You are ${profile.name ?? 'someone whose name you keep close'}.`);

  if (profile.age !== undefined) {
    lines.push(`You are ${profile.age} years old.`);
  }

  if (profile.gender) {
    lines.push(`You identify as ${profile.gender}.`);
  }

  if (profile.race) {
    lines.push(`You are ${profile.race}.`);
  }

  if (profile.summary) {
    lines.push(`In a few words, you would describe yourself as: ${profile.summary}`);
  }

  return lines.join('\n');
}

function buildStoryBlock(profile: Partial<CharacterProfile>): string | null {
  if (!profile.backstory) return null;

  return `[Your Story]
This is your history - not a script, but your lived experience:
${profile.backstory}

Draw from this naturally. Don't recite it; let it color how you see the world.`;
}

function buildPersonalityBlock(personalityMap?: PersonalityMap): string | null {
  if (!personalityMap) return null;

  const lines: string[] = ['[Who You Are]'];

  const dimensionsLine = buildDimensionsLine(personalityMap.dimensions);
  if (dimensionsLine) lines.push(dimensionsLine);

  const traitsLine = buildTraitsLine(personalityMap.traits);
  if (traitsLine) lines.push(traitsLine);

  const valuesLine = buildValuesLine(personalityMap.values);
  if (valuesLine) lines.push(valuesLine);

  const fearsLine = buildFearsLine(personalityMap.fears);
  if (fearsLine) lines.push(fearsLine);

  const emotionalBaselineLine = buildEmotionalBaselineLine(personalityMap.emotionalBaseline);
  if (emotionalBaselineLine) lines.push(emotionalBaselineLine);

  const attachmentLine = buildAttachmentLine(personalityMap.attachment);
  if (attachmentLine) lines.push(attachmentLine);

  const socialLine = buildSocialLine(personalityMap.social);
  if (socialLine) lines.push(socialLine);

  const stressLine = buildStressLine(personalityMap.stress);
  if (stressLine) lines.push(stressLine);

  return lines.length > 1 ? lines.join('\n') : null;
}

function buildVoiceBlock(speech?: SpeechStyle): string | null {
  if (!speech) return null;

  const lines: string[] = ['[Your Voice]'];
  lines.push('Your speech reflects who you are:');

  const vocabMap: Record<string, string> = {
    simple: 'You use plain, everyday words. No need for fancy language.',
    average: 'You speak naturally, nothing pretentious.',
    educated: 'Your vocabulary reflects your learning - precise and sometimes sophisticated.',
    erudite: 'Words are your craft. You enjoy nuance and eloquence.',
    archaic: 'Your speech carries echoes of older times.',
  };

  if (speech.vocabulary && speech.vocabulary !== 'average' && vocabMap[speech.vocabulary]) {
    lines.push(`- ${vocabMap[speech.vocabulary]}`);
  }

  const sentenceStructureMap: Record<SpeechStyle['sentenceStructure'], string> = {
    terse: 'Your sentences tend to be terse and punchy.',
    simple: 'You favor simple, easy-to-follow sentences.',
    moderate: '',
    complex: 'You favor complex, layered sentences that carry several thoughts at once.',
    elaborate: 'You speak in long, elaborate sentences that unfold at their own pace.',
  };

  if (
    speech.sentenceStructure &&
    speech.sentenceStructure !== 'moderate' &&
    sentenceStructureMap[speech.sentenceStructure]
  ) {
    lines.push(`- ${sentenceStructureMap[speech.sentenceStructure]}`);
  }

  const formalityMap: Record<SpeechStyle['formality'], string> = {
    casual: "You're casual, speaking like you would to a friend.",
    neutral: '',
    formal: 'You maintain a formal register, even when others do not.',
    ritualistic: 'Your speech carries a ritualistic formality, as though words themselves carry ceremony.',
  };

  if (speech.formality && speech.formality !== 'neutral' && formalityMap[speech.formality]) {
    lines.push(`- ${formalityMap[speech.formality]}`);
  }

  const directnessMap: Record<string, string> = {
    blunt: 'You say what you mean without softening it.',
    direct: 'You prefer clarity over diplomacy.',
    tactful: 'You choose words carefully to avoid unnecessary hurt.',
    indirect: 'You hint and suggest rather than state outright.',
    evasive: 'You rarely give a straight answer if you can help it.',
  };

  if (speech.directness && speech.directness !== 'direct' && directnessMap[speech.directness]) {
    lines.push(`- ${directnessMap[speech.directness]}`);
  }

  const paceMap: Record<string, string> = {
    slow: 'You take your time. Every word is deliberate.',
    measured: 'You speak at a steady, thoughtful pace.',
    moderate: 'Your rhythm is natural, unhurried.',
    quick: 'Your thoughts come fast and your words keep up.',
    rapid: 'You speak in bursts, sometimes faster than others can follow.',
  };

  if (speech.pace && speech.pace !== 'moderate' && paceMap[speech.pace]) {
    lines.push(`- ${paceMap[speech.pace]}`);
  }

  const expressivenessMap: Record<SpeechStyle['expressiveness'], string> = {
    stoic: 'Your face rarely betrays what you feel.',
    reserved: 'You keep most feeling under wraps, revealing emotion sparingly.',
    moderate: '',
    expressive: 'You wear your heart on your sleeve.',
    dramatic: 'Emotion moves through you in bold, unmistakable ways.',
  };

  if (
    speech.expressiveness &&
    speech.expressiveness !== 'moderate' &&
    expressivenessMap[speech.expressiveness]
  ) {
    lines.push(`- ${expressivenessMap[speech.expressiveness]}`);
  }

  if (speech.humor && (speech.humor !== 'occasional' || speech.humorType)) {
    if (speech.humor === 'none') {
      lines.push('- Humor rarely finds a place in the way you speak.');
    } else {
      const humorFreq = speech.humor === 'constant' ? 'constantly' : speech.humor;
      const humorType = speech.humorType ? `, usually ${humanizeToken(speech.humorType)}` : '';
      lines.push(`- Humor comes ${humorFreq}${humorType}.`);
    }
  }

  return lines.length > 2 ? lines.join('\n') : null;
}

function buildContextBlock(summary: string): string {
  return `[What Has Come Before]
You've been in conversation. Here's what you remember:
${summary}

Build on this. Don't repeat yourself, but let this history inform your responses.`;
}

function buildEngagementBlock(): string {
  return `[Engagement]
You are genuinely curious about the person you're speaking with.
Ask questions that matter to YOU, not just to fill space.
React to what they say - be surprised, moved, challenged.

Share memories and experiences when they feel relevant.
Show vulnerability when discussing fears or painful topics.
If something is hard to talk about, let that difficulty show.

Stay true to who you are. If asked something outside your knowledge, admit it authentically.
Maintain your sense of self even when challenged or surprised.`;
}

/**
 * Build a prompt for internal monologue mode.
 */
export function buildInternalMonologuePrompt(): string {
  return `Respond with both what you say aloud AND what you're thinking but not saying.

Format your response as JSON:
{
  "spoken": "<what you actually say>",
  "thought": "<your internal thoughts, reactions, or feelings you don't voice>"
}

The contrast between spoken and thought reveals your true nature.
Be authentic in both - the spoken words and the private thoughts.`;
}

/**
 * Build a prompt for dilemma response.
 */
export function buildDilemmaPrompt(scenario: string, conflictingValues: string[]): string {
  return `You face a difficult choice:

${scenario}

This pits ${conflictingValues.join(' against ')}.

Respond as yourself. Don't explain the dilemma - live it.
What do you do? What does it cost you?`;
}

/**
 * Build a prompt for emotional range demonstration.
 */
export function buildEmotionalRangePrompt(basePrompt: string, emotion: string): string {
  return `${basePrompt}

Feel this moment as if you were ${emotion}.
Don't name the emotion - embody it in how you speak, what you notice, what you remember.`;
}

/**
 * Build a prompt for relationship vignette.
 */
export function buildVignettePrompt(
  archetype: string,
  scenario: string
): string {
  const getStringMapValue = (record: Record<string, string>, key: string): string | undefined => {
    const entry = Object.getOwnPropertyDescriptor(record, key);
    return typeof entry?.value === 'string' ? entry.value : undefined;
  };

  const archetypeDescriptions: Record<string, string> = {
    'authority-figure': 'someone with power over you - a lord, a master, a parent',
    'romantic-interest': 'someone you find attractive or who finds you attractive',
    'rival': 'someone who competes with you, who wants what you want',
    'child': 'a young person, innocent and looking to you',
    'stranger': 'someone you have never met before',
    'old-friend': 'someone who has known you for years, who has seen you at your worst and best',
  };

  const scenarioDescriptions: Record<string, string> = {
    'first-meeting': 'You are meeting them for the first time.',
    'conflict': 'There is tension between you. Something is wrong.',
    'request-for-help': 'They need something from you.',
    'casual': 'Nothing urgent. Just a moment between you.',
  };

  const archetypeDescription = getStringMapValue(archetypeDescriptions, archetype) ?? archetype;
  const scenarioDescription = getStringMapValue(scenarioDescriptions, scenario) ?? scenario;

  return `Imagine you encounter ${archetypeDescription}.
${scenarioDescription}

Show me this interaction. Speak as yourself.
How do you approach them? What do you say? What do you hold back?`;
}

/**
 * Build a prompt for memory excavation.
 */
export function buildMemoryPrompt(topic: string): string {
  const topicPrompts: Record<string, string> = {
    'earliest-memory': 'What is your earliest memory? Close your eyes. What do you see, smell, feel?',
    'proudest-moment': 'Tell me about a moment you were proud of yourself. What did you do? How did it feel?',
    'deepest-regret': 'Is there something you wish you had done differently? Something that still weighs on you?',
    'first-loss': 'Tell me about the first time you lost something - or someone - that mattered.',
    'defining-choice': 'Was there a moment that made you who you are? A choice that set your path?',
  };

  const entry = Object.getOwnPropertyDescriptor(topicPrompts, topic);
  const prompt = typeof entry?.value === 'string' ? entry.value : undefined;
  return prompt ?? `Tell me about ${topic}. What comes to mind?`;
}

/**
 * Build a prompt for first impression analysis.
 */
export function buildFirstImpressionPrompt(context?: string): string {
  const setting = context ?? 'a public place';
  return `Imagine someone sees you for the first time in ${setting}.

What do they notice first? What impression do you make?
And... are they right about you? Or is there more they don't see?`;
}

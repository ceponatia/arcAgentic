import type { BodyRegion } from '../body-regions/regions.js';
import type { AppealTagCategory, AppealTagDefinition, AppealTagId } from './appeal-tags.js';

interface AppealTagSeed {
  readonly id: string;
  readonly label: string;
  readonly category: AppealTagCategory;
  readonly description: string;
  readonly bodyRegions: readonly BodyRegion[];
  readonly promptTemplate: string;
  readonly triggerKeywords: readonly [string, ...string[]];
}

type NonEmptyAppealTags = readonly [AppealTagSeed, ...AppealTagSeed[]];

function defineAppealTags<const TTags extends NonEmptyAppealTags>(
  tags: TTags,
): TTags {
  return tags;
}

function deriveAppealTagIds<const TTags extends NonEmptyAppealTags>(
  tags: TTags,
): { readonly [K in keyof TTags]: TTags[K]['id'] } {
  return tags.map((tag) => tag.id) as { readonly [K in keyof TTags]: TTags[K]['id'] };
}

function toAppealTagDefinition(tag: AppealTagSeed): AppealTagDefinition {
  return {
    ...tag,
    bodyRegions: [...tag.bodyRegions],
    triggerKeywords: [...tag.triggerKeywords],
  };
}

export const MAX_PERSONA_APPEAL_TAGS = 6;

const BUILT_IN_APPEAL_TAGS_DATA = defineAppealTags([
  {
    id: 'hair',
    label: 'Hair',
    category: 'body',
    description: 'Appeal focused on hair texture, movement, scent, or the intimacy of touching it.',
    bodyRegions: ['hair'],
    promptTemplate:
      "The player is especially drawn to {npcName}'s {featureLabel}. When it fits the moment, lean into that feature with romantic sensory detail such as {sensoryDetail}.",
    triggerKeywords: ['touch hair', 'stroke hair', 'run fingers', 'brush hair', 'smell hair'],
  },
  {
    id: 'eyes',
    label: 'Eyes',
    category: 'body',
    description: 'Appeal centered on eye contact, expression, and the emotional charge of a lingering gaze.',
    bodyRegions: ['face'],
    promptTemplate:
      "The player is especially drawn to {npcName}'s {featureLabel}. When the scene supports it, emphasize that attraction through focused sensory detail like {sensoryDetail}.",
    triggerKeywords: ['gaze', 'look into', 'stare', 'eyes'],
  },
  {
    id: 'lips',
    label: 'Lips',
    category: 'body',
    description: 'Appeal oriented around the mouth, kisses, and the softness or taste associated with close contact.',
    bodyRegions: ['mouth'],
    promptTemplate:
      "The player is especially drawn to {npcName}'s {featureLabel}. When intimacy is relevant, highlight it with restrained sensory detail such as {sensoryDetail}.",
    triggerKeywords: ['kiss', 'lips', 'mouth', 'taste'],
  },
  {
    id: 'hands',
    label: 'Hands',
    category: 'body',
    description: 'Appeal tied to touch, held hands, fingers, grip, and small gestures of connection.',
    bodyRegions: ['leftHand', 'rightHand'],
    promptTemplate:
      "The player is especially drawn to {npcName}'s {featureLabel}. When touch or closeness comes up, make room for sensory detail like {sensoryDetail} if it suits the moment.",
    triggerKeywords: ['hold hands', 'fingers', 'touch', 'grip', 'intertwine'],
  },
  {
    id: 'neck',
    label: 'Neck',
    category: 'body',
    description: 'Appeal focused on the neck and throat, especially in moments of breath, nuzzling, or kisses.',
    bodyRegions: ['neck', 'nape', 'throat'],
    promptTemplate:
      "The player is especially drawn to {npcName}'s {featureLabel}. When the scene invites closeness, let that attraction inform subtle sensory detail such as {sensoryDetail}.",
    triggerKeywords: ['kiss neck', 'nuzzle', 'breathe on', 'throat'],
  },
  {
    id: 'feet',
    label: 'Feet',
    category: 'body',
    description: 'Appeal focused on the feet, especially in moments of touch, massage, or intimacy.',
    bodyRegions: ['feet', 'toes'],
    promptTemplate:
      "The player is especially drawn to {npcName}'s {featureLabel}. When the scene invites closeness, let that attraction inform subtle sensory detail such as {sensoryDetail}. Incorporate foot fetish play when this tag is invoked.",
    triggerKeywords: ['kiss feet', 'massage', 'touch', 'toes', 'sniff', 'inhale'],
  },
  {
    id: 'voice',
    label: 'Voice',
    category: 'sensory',
    description: 'Appeal based on voice, tone, whispers, and the emotional texture of speech.',
    bodyRegions: [],
    promptTemplate:
      "The player is especially drawn to {npcName}'s {featureLabel}. When dialogue matters, lean into that quality with sensory detail like {sensoryDetail} where appropriate.",
    triggerKeywords: ['speak', 'whisper', 'say', 'voice', 'tone', 'murmur'],
  },
  {
    id: 'scent',
    label: 'Scent',
    category: 'sensory',
    description: 'Appeal driven by fragrance, skin scent, or the closeness of breathing someone in.',
    bodyRegions: [],
    promptTemplate:
      "The player is especially drawn to {npcName}'s {featureLabel}. When closeness makes it relevant, bring in light sensory detail such as {sensoryDetail}.",
    triggerKeywords: ['smell', 'scent', 'fragrance', 'breathe in', 'aroma'],
  },
  {
    id: 'warmth',
    label: 'Warmth',
    category: 'sensory',
    description: 'Appeal shaped by body heat, embracing, and the comfort of physical closeness.',
    bodyRegions: ['torso', 'arms'],
    promptTemplate:
      "The player is especially drawn to {npcName}'s {featureLabel}. When physical closeness fits the scene, let that show through sensory detail like {sensoryDetail}.",
    triggerKeywords: ['hold', 'embrace', 'hug', 'press against', 'warm', 'body heat'],
  },
  {
    id: 'skin',
    label: 'Skin',
    category: 'body',
    description: 'Appeal centered on skin texture, softness, and the feel of touch across exposed areas.',
    bodyRegions: ['torso', 'arms', 'face'],
    promptTemplate:
      "The player is especially drawn to {npcName}'s {featureLabel}. When touch is present, incorporate sensory detail like {sensoryDetail} if it is contextually appropriate.",
    triggerKeywords: ['touch', 'caress', 'skin', 'soft', 'smooth', 'trace'],
  },
  {
    id: 'shoulders',
    label: 'Shoulders',
    category: 'body',
    description: 'Appeal focused on broad or comforting shoulders and the intimacy of leaning in.',
    bodyRegions: ['leftShoulder', 'rightShoulder'],
    promptTemplate:
      "The player is especially drawn to {npcName}'s {featureLabel}. When closeness or comfort is in play, support it with sensory detail such as {sensoryDetail}.",
    triggerKeywords: ['lean on', 'shoulder', 'rest head', 'broad'],
  },
  {
    id: 'chest',
    label: 'Chest',
    category: 'body',
    description: 'Appeal connected to chest contact, heartbeat, and the sense of being pulled close.',
    bodyRegions: ['chest'],
    promptTemplate:
      "The player is especially drawn to {npcName}'s {featureLabel}. When the scene turns intimate or protective, use sensory detail like {sensoryDetail} where it feels natural.",
    triggerKeywords: ['chest', 'lean against', 'heartbeat', 'press'],
  },
  {
    id: 'back',
    label: 'Back',
    category: 'body',
    description: 'Appeal tied to hands on the back, the line of the spine, and lingering touch across it.',
    bodyRegions: ['back', 'spine'],
    promptTemplate:
      "The player is especially drawn to {npcName}'s {featureLabel}. When touch or comfort is relevant, weave in sensory detail such as {sensoryDetail} if it suits the scene.",
    triggerKeywords: ['back', 'scratch', 'massage', 'run hands'],
  },
]);

export const BUILT_IN_APPEAL_TAGS: AppealTagDefinition[] = BUILT_IN_APPEAL_TAGS_DATA.map(
  toAppealTagDefinition,
);

export const BUILT_IN_APPEAL_TAG_IDS = deriveAppealTagIds(BUILT_IN_APPEAL_TAGS_DATA);

const BUILT_IN_APPEAL_TAGS_BY_ID = new Map(
  BUILT_IN_APPEAL_TAGS.map((tag) => [tag.id, tag] as const),
);

const BUILT_IN_APPEAL_TAG_ID_SET = new Set<string>(BUILT_IN_APPEAL_TAG_IDS);

export function getAppealTagDefinition(
  id: string,
): AppealTagDefinition | undefined {
  return BUILT_IN_APPEAL_TAGS_BY_ID.get(id);
}

export function isAppealTagId(value: string): value is AppealTagId {
  return BUILT_IN_APPEAL_TAG_ID_SET.has(value);
}

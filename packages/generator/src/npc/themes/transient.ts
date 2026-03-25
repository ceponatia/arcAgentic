import { BASE_THEME } from '../../character/themes/base.js';
import {
  BODY_SCENTS,
  BUILDS,
  EYE_COLORS_WEIGHTED,
  FEAR_DESCRIPTIONS,
  FEMALE_FIRST_NAMES,
  HAIR_COLORS_WEIGHTED,
  HAIR_LENGTHS_FEMALE_WEIGHTED,
  HAIR_STYLES_WEIGHTED,
  HEIGHTS,
  LAST_NAMES,
  MALE_FIRST_NAMES,
  NEUTRAL_TRAITS,
  POSITIVE_TRAITS,
  SKIN_TEXTURES,
  SKIN_TONES_WEIGHTED,
  SUMMARY_TEMPLATES_NEUTRAL,
} from '../../character/pools/index.js';
import type { CharacterTheme } from '../../character/types.js';

const TRANSIENT_TRAITS = [...POSITIVE_TRAITS.slice(0, 8), ...NEUTRAL_TRAITS.slice(0, 4)];
const TRANSIENT_DETAIL_LABELS = BASE_THEME.details.labels.preference
  ? { preference: BASE_THEME.details.labels.preference }
  : {};
const TRANSIENT_DETAIL_VALUES = BASE_THEME.details.values.preference
  ? { preference: BASE_THEME.details.values.preference }
  : {};

/**
 * Theme for fast-turnover NPCs generated from the existing character pools.
 */
export const TRANSIENT_NPC_THEME: CharacterTheme = {
  id: 'transient-npc',
  name: 'Transient NPC',
  description:
    'A lightweight theme for generic fast-turnover NPCs that need quick, serviceable profiles.',
  basics: {
    firstNames: [...FEMALE_FIRST_NAMES.slice(0, 18), ...MALE_FIRST_NAMES.slice(0, 18)],
    lastNames: LAST_NAMES.slice(0, 18),
    ageRange: [18, 55],
    summaryTemplates: SUMMARY_TEMPLATES_NEUTRAL,
    backstoryTemplates: BASE_THEME.basics.backstoryTemplates.slice(0, 3),
    personalityTraits: TRANSIENT_TRAITS,
  },
  appearance: {
    heights: HEIGHTS,
    builds: BUILDS,
    skinTones: SKIN_TONES_WEIGHTED,
    hairColors: HAIR_COLORS_WEIGHTED,
    hairStyles: HAIR_STYLES_WEIGHTED,
    hairLengths: HAIR_LENGTHS_FEMALE_WEIGHTED.slice(0, 6),
    eyeColors: EYE_COLORS_WEIGHTED,
  },
  personality: {
    traits: TRANSIENT_TRAITS,
    values: BASE_THEME.personality.values.slice(0, 6),
    fearCategories: BASE_THEME.personality.fearCategories.slice(0, 4),
    fearDescriptions: Object.values(FEAR_DESCRIPTIONS).flat().slice(0, 8),
    copingMechanisms: BASE_THEME.personality.copingMechanisms.slice(0, 4),
    attachmentStyles: BASE_THEME.personality.attachmentStyles.slice(0, 3),
    moodBaselines: BASE_THEME.personality.moodBaselines.slice(0, 3),
    currentEmotions: BASE_THEME.personality.currentEmotions.slice(0, 4),
    emotionIntensities: BASE_THEME.personality.emotionIntensities.slice(0, 3),
  },
  body: {
    general: {
      scentPrimaries: BODY_SCENTS,
      texturePrimaries: SKIN_TEXTURES,
    },
    regionPopulationRate: 0,
  },
  details: {
    labels: TRANSIENT_DETAIL_LABELS,
    values: TRANSIENT_DETAIL_VALUES,
    countRange: [0, 1],
    focusAreas: ['preference'],
  },
  defaultTags: ['generated', 'transient'],
};
import type { BodyRegion } from '../regions.js';
import type { BodyRegionData } from '../sensory-types.js';
import type { ClassificationDefaultMap } from './types.js';

type PartialBodyMap = Partial<Record<BodyRegion, Partial<BodyRegionData>>>;

function forRegions(
  data: Partial<BodyRegionData>,
  ...regions: readonly BodyRegion[]
): PartialBodyMap {
  return Object.fromEntries(regions.map((region) => [region, data])) as PartialBodyMap;
}

function mergeMaps(...maps: readonly PartialBodyMap[]): PartialBodyMap {
  const result: PartialBodyMap = {};
  Object.assign(result, ...maps);
  return result;
}

// Race-neutral elf baseline emphasizes refined features, softer textures, and subtler scents.
const ELF_NEUTRAL_DEFAULTS = mergeMaps(
  forRegions(
    {
      visual: {
        description: 'Refined elven features give the face a calm, luminous look.',
        features: ['smooth contours'],
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', notes: ['fresh air'], intensity: 0.12 },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'face'
  ),
  forRegions(
    {
      visual: {
        description: 'Elven hair falls in fine, lustrous strands with a natural gloss.',
        features: ['fine strands'],
      },
      scent: { primary: 'clean hair', notes: ['linen'], intensity: 0.16 },
      texture: { primary: 'silky', temperature: 'cool', moisture: 'normal' },
    },
    'hair'
  ),
  forRegions(
    {
      visual: {
        description: 'Elven ears taper gracefully to a delicate point.',
        features: ['tapered point'],
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', intensity: 0.11 },
      texture: { primary: 'smooth', temperature: 'neutral', moisture: 'normal' },
    },
    'ears',
    'leftEar',
    'rightEar'
  ),
  forRegions(
    {
      visual: {
        description: 'The neck looks long and graceful, with smooth, luminous skin.',
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', notes: ['fresh air'], intensity: 0.12 },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'neck',
    'throat',
    'nape'
  ),
  forRegions(
    {
      visual: {
        description: 'The shoulders hold an elegant line with almost unblemished skin.',
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', intensity: 0.13 },
      texture: { primary: 'smooth', temperature: 'neutral', moisture: 'normal' },
    },
    'leftShoulder',
    'rightShoulder'
  ),
  forRegions(
    {
      visual: {
        description: 'The chest shows graceful definition beneath smooth skin.',
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', intensity: 0.14 },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'chest'
  ),
  forRegions(
    {
      visual: {
        description: 'The upper and lower back look straight and elegantly composed.',
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', intensity: 0.13 },
      texture: { primary: 'smooth', temperature: 'neutral', moisture: 'normal' },
    },
    'upperBack',
    'lowerBack'
  ),
  forRegions(
    {
      visual: {
        description: 'The abdomen appears smooth and lightly toned.',
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', intensity: 0.14 },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'abdomen'
  ),
  forRegions(
    {
      visual: {
        description: 'The arms look lean and refined, with nearly seamless skin.',
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', intensity: 0.13 },
      texture: { primary: 'smooth', temperature: 'neutral', moisture: 'normal' },
    },
    'leftUpperArm',
    'rightUpperArm',
    'leftForearm',
    'rightForearm'
  ),
  forRegions(
    {
      visual: {
        description: 'The hands are graceful and neatly kept, with long, precise fingers.',
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', notes: ['linen'], intensity: 0.11 },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'leftHand',
    'rightHand'
  ),
  forRegions(
    {
      visual: {
        description: 'The thighs and lower legs carry a lean, balanced elven frame.',
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', intensity: 0.14 },
      texture: { primary: 'smooth', temperature: 'neutral', moisture: 'normal' },
    },
    'leftThigh',
    'rightThigh',
    'leftCalf',
    'rightCalf',
    'leftShin',
    'rightShin'
  ),
  forRegions(
    {
      visual: {
        description: 'The knees stay clean and subtly defined, even after long travel.',
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', intensity: 0.11 },
      texture: { primary: 'smooth', temperature: 'neutral', moisture: 'normal' },
    },
    'leftKnee',
    'rightKnee'
  ),
  forRegions(
    {
      visual: {
        description: 'The feet and toes are neat, light, and carefully maintained.',
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean feet', notes: ['linen'], intensity: 0.14 },
      texture: { primary: 'smooth', temperature: 'cool', moisture: 'dry' },
    },
    'leftFoot',
    'rightFoot',
    'toes'
  )
);

const ELF_MALE_BASE = mergeMaps(
  forRegions(
    {
      visual: {
        description: 'Elven masculine features stay refined, with a quiet angularity.',
        features: ['high cheekbones'],
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', notes: ['fresh air'], intensity: 0.13 },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'face'
  ),
  forRegions(
    {
      visual: {
        description: 'Hair remains sleek and dense, falling in controlled lines.',
        features: ['sleek texture'],
      },
      texture: { primary: 'silky', temperature: 'cool', moisture: 'normal' },
    },
    'hair'
  ),
  forRegions(
    {
      visual: {
        description: 'The chest, shoulders, and arms look lean rather than bulky.',
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', intensity: 0.14 },
      texture: { primary: 'smooth', temperature: 'neutral', moisture: 'normal' },
    },
    'chest',
    'leftShoulder',
    'rightShoulder',
    'leftUpperArm',
    'rightUpperArm',
    'leftForearm',
    'rightForearm'
  ),
  forRegions(
    {
      visual: {
        description: 'The hands look deft and steady, suited to delicate work.',
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', intensity: 0.11 },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'leftHand',
    'rightHand'
  )
);

const ELF_MALE_YOUNG_ADULT = mergeMaps(
  forRegions(
    {
      visual: {
        description: 'Youthful elven features look luminous and nearly untouched by age.',
        features: ['clear skin'],
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', notes: ['fresh air'], intensity: 0.12 },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'face'
  ),
  forRegions(
    {
      visual: {
        description: 'Hair falls with youthful fullness and a polished shine.',
        features: ['full at the crown'],
      },
      texture: { primary: 'silky', temperature: 'cool', moisture: 'normal' },
    },
    'hair'
  )
);

const ELF_MALE_ADULT = mergeMaps(
  forRegions(
    {
      visual: {
        description: 'Adult elven masculine features stay composed and finely cut.',
        features: ['settled expression'],
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', notes: ['fresh air'], intensity: 0.13 },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'face'
  ),
  forRegions(
    {
      visual: {
        description: 'The hands remain smooth with only the slightest sign of use.',
        skinCondition: 'flawless',
      },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'leftHand',
    'rightHand'
  )
);

const ELF_MALE_MIDDLE_AGED = mergeMaps(
  forRegions(
    {
      visual: {
        description: 'Middle-aged elven masculine features show composure more than age.',
        features: ['faint silver at the temples'],
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', notes: ['fresh air'], intensity: 0.13 },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'face'
  ),
  forRegions(
    {
      visual: {
        description: 'Hair stays thick and smooth, touched only by a hint of silver.',
        features: ['subtle silver at the temples'],
      },
      texture: { primary: 'silky', temperature: 'cool', moisture: 'normal' },
      appearance: { hairTone: 'lightly silvered' },
    },
    'hair'
  )
);

const ELF_FEMALE_BASE = mergeMaps(
  forRegions(
    {
      visual: {
        description: 'Feminine elven features look delicate, serene, and carefully composed.',
        features: ['soft cheekbones'],
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', notes: ['fresh air'], intensity: 0.11 },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'face'
  ),
  forRegions(
    {
      visual: {
        description: 'Hair appears fine, glossy, and almost weightless.',
        features: ['fine luster'],
      },
      scent: { primary: 'clean hair', notes: ['linen'], intensity: 0.15 },
      texture: { primary: 'silky', temperature: 'cool', moisture: 'normal' },
    },
    'hair'
  ),
  forRegions(
    {
      visual: {
        description: 'The neck, shoulders, and chest keep an elegant, lightly sculpted line.',
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', intensity: 0.12 },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'neck',
    'throat',
    'nape',
    'leftShoulder',
    'rightShoulder',
    'chest'
  ),
  forRegions(
    {
      visual: {
        description: 'The arms and hands look graceful, precise, and immaculately kept.',
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', intensity: 0.11 },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'leftUpperArm',
    'rightUpperArm',
    'leftForearm',
    'rightForearm',
    'leftHand',
    'rightHand'
  ),
  forRegions(
    {
      visual: {
        description: 'The legs and feet remain smooth and light, even after travel.',
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', intensity: 0.12 },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'leftThigh',
    'rightThigh',
    'leftCalf',
    'rightCalf',
    'leftShin',
    'rightShin',
    'leftFoot',
    'rightFoot',
    'toes'
  )
);

const ELF_FEMALE_YOUNG_ADULT = mergeMaps(
  forRegions(
    {
      visual: {
        description: 'Youthful elven feminine features look luminous and softly expressive.',
        features: ['clear, luminous skin'],
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', notes: ['fresh air'], intensity: 0.1 },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'face'
  ),
  forRegions(
    {
      visual: {
        description: 'Hair falls in bright, weightless strands with a polished gloss.',
        features: ['bright sheen'],
      },
      texture: { primary: 'silky', temperature: 'cool', moisture: 'normal' },
    },
    'hair'
  )
);

const ELF_FEMALE_ADULT = mergeMaps(
  forRegions(
    {
      visual: {
        description: 'Adult elven feminine features remain poised and nearly ageless.',
        features: ['settled expression'],
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', notes: ['fresh air'], intensity: 0.11 },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'face'
  ),
  forRegions(
    {
      visual: {
        description: 'The hands remain smooth and careful, with almost no visible wear.',
        skinCondition: 'flawless',
      },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'leftHand',
    'rightHand'
  )
);

const ELF_FEMALE_MIDDLE_AGED = mergeMaps(
  forRegions(
    {
      visual: {
        description: 'Middle-aged elven feminine features gain gravitas without losing softness.',
        features: ['only the faintest age lines'],
        skinCondition: 'flawless',
      },
      scent: { primary: 'clean skin', notes: ['fresh air'], intensity: 0.11 },
      texture: { primary: 'silken', temperature: 'neutral', moisture: 'normal' },
    },
    'face'
  ),
  forRegions(
    {
      visual: {
        description: 'Hair remains thick and bright, with only a suggestion of silver.',
        features: ['subtle silver threads'],
      },
      texture: { primary: 'silky', temperature: 'cool', moisture: 'normal' },
      appearance: { hairTone: 'soft silver threads' },
    },
    'hair'
  )
);

export const ELF_DEFAULTS: ClassificationDefaultMap = {
  '*': {
    '*': ELF_NEUTRAL_DEFAULTS,
  },
  male: {
    '*': ELF_MALE_BASE,
    'young-adult': ELF_MALE_YOUNG_ADULT,
    adult: ELF_MALE_ADULT,
    'middle-aged': ELF_MALE_MIDDLE_AGED,
  },
  female: {
    '*': ELF_FEMALE_BASE,
    'young-adult': ELF_FEMALE_YOUNG_ADULT,
    adult: ELF_FEMALE_ADULT,
    'middle-aged': ELF_FEMALE_MIDDLE_AGED,
  },
};

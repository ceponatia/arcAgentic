import type { BodyRegion } from '../regions.js';
import type { BodyRegionData } from '../sensory-types.js';
import type { ClassificationDefaultMap } from './types.js';

type PartialBodyMap = Partial<Record<BodyRegion, Partial<BodyRegionData>>>;

function forRegions(
  data: Partial<BodyRegionData>,
  ...regions: readonly BodyRegion[]
): PartialBodyMap {
  const result: PartialBodyMap = {};

  for (const region of regions) {
    result[region] = data;
  }

  return result;
}

function mergeMaps(...maps: readonly PartialBodyMap[]): PartialBodyMap {
  const result: PartialBodyMap = {};
  Object.assign(result, ...maps);
  return result;
}

// Race-neutral human baseline used whenever gender-specific data is unavailable.
const HUMAN_NEUTRAL_DEFAULTS = mergeMaps(
  forRegions(
    {
      visual: {
        description: 'Human face with balanced features and healthy skin.',
        skinCondition: 'normal',
      },
      scent: { primary: 'clean skin', notes: ['soap'], intensity: 0.18 },
      texture: { primary: 'smooth', temperature: 'warm', moisture: 'normal' },
    },
    'face'
  ),
  forRegions(
    {
      visual: {
        description: 'Human hair with a natural sheen and an everyday, well-kept look.',
        features: ['well-kept strands'],
      },
      scent: { primary: 'clean hair', notes: ['shampoo'], intensity: 0.24 },
      texture: { primary: 'soft', temperature: 'neutral', moisture: 'normal' },
    },
    'hair'
  ),
  forRegions(
    {
      visual: {
        description: 'Human ears sit close to the head with a natural contour.',
        skinCondition: 'normal',
      },
      scent: { primary: 'clean skin', intensity: 0.16 },
      texture: { primary: 'smooth', temperature: 'warm', moisture: 'normal' },
    },
    'ears',
    'leftEar',
    'rightEar'
  ),
  forRegions(
    {
      visual: {
        description: 'The front of the neck looks healthy and naturally mobile.',
        skinCondition: 'normal',
      },
      scent: { primary: 'warm skin', notes: ['soap'], intensity: 0.2 },
      texture: { primary: 'supple', temperature: 'warm', moisture: 'normal' },
    },
    'neck',
    'throat'
  ),
  forRegions(
    {
      visual: {
        description: 'The back of the neck shows healthy skin and a natural hairline.',
        skinCondition: 'normal',
      },
      scent: { primary: 'warm skin', notes: ['clean hair'], intensity: 0.22 },
      texture: { primary: 'smooth', temperature: 'warm', moisture: 'normal' },
    },
    'nape'
  ),
  forRegions(
    {
      visual: {
        description: 'The shoulders carry a natural human frame with healthy skin.',
        skinCondition: 'normal',
      },
      scent: { primary: 'warm skin', intensity: 0.2 },
      texture: { primary: 'firm', temperature: 'warm', moisture: 'normal' },
    },
    'leftShoulder',
    'rightShoulder'
  ),
  forRegions(
    {
      visual: {
        description: 'The chest shows a natural contour and healthy skin tone.',
        skinCondition: 'normal',
      },
      scent: { primary: 'warm skin', intensity: 0.22 },
      texture: { primary: 'smooth', temperature: 'warm', moisture: 'normal' },
    },
    'chest'
  ),
  forRegions(
    {
      visual: {
        description: 'The upper back appears healthy with an even skin tone.',
        skinCondition: 'normal',
      },
      scent: { primary: 'clean skin', intensity: 0.21 },
      texture: { primary: 'firm', temperature: 'warm', moisture: 'normal' },
    },
    'upperBack'
  ),
  forRegions(
    {
      visual: {
        description: 'The lower back has healthy skin and a relaxed human posture.',
        skinCondition: 'normal',
      },
      scent: { primary: 'clean skin', intensity: 0.2 },
      texture: { primary: 'smooth', temperature: 'warm', moisture: 'normal' },
    },
    'lowerBack'
  ),
  forRegions(
    {
      visual: {
        description: 'The abdomen looks healthy and naturally toned.',
        skinCondition: 'normal',
      },
      scent: { primary: 'warm skin', intensity: 0.22 },
      texture: { primary: 'smooth', temperature: 'warm', moisture: 'normal' },
    },
    'abdomen'
  ),
  forRegions(
    {
      visual: {
        description: 'The upper arms show healthy skin over a natural frame.',
        skinCondition: 'normal',
      },
      scent: { primary: 'clean skin', intensity: 0.2 },
      texture: { primary: 'firm', temperature: 'warm', moisture: 'normal' },
    },
    'leftUpperArm',
    'rightUpperArm'
  ),
  forRegions(
    {
      visual: {
        description: 'The forearms appear healthy with everyday human texture.',
        skinCondition: 'normal',
      },
      scent: { primary: 'clean skin', intensity: 0.2 },
      texture: { primary: 'smooth', temperature: 'warm', moisture: 'normal' },
    },
    'leftForearm',
    'rightForearm'
  ),
  forRegions(
    {
      visual: {
        description: 'The hands look clean and lived-in, with neatly kept skin.',
        skinCondition: 'normal',
      },
      scent: { primary: 'clean skin', notes: ['soap'], intensity: 0.18 },
      texture: { primary: 'soft', temperature: 'warm', moisture: 'normal' },
    },
    'leftHand',
    'rightHand'
  ),
  forRegions(
    {
      visual: {
        description: 'The thighs show healthy skin and a steady human build.',
        skinCondition: 'normal',
      },
      scent: { primary: 'warm skin', intensity: 0.24 },
      texture: { primary: 'firm', temperature: 'warm', moisture: 'normal' },
    },
    'leftThigh',
    'rightThigh'
  ),
  forRegions(
    {
      visual: {
        description: 'The knees appear healthy, with ordinary creases from movement.',
        skinCondition: 'normal',
      },
      scent: { primary: 'clean skin', intensity: 0.18 },
      texture: { primary: 'firm', temperature: 'warm', moisture: 'normal' },
    },
    'leftKnee',
    'rightKnee'
  ),
  forRegions(
    {
      visual: {
        description: 'The shins and calves show healthy skin over a practical build.',
        skinCondition: 'normal',
      },
      scent: { primary: 'clean skin', intensity: 0.19 },
      texture: { primary: 'firm', temperature: 'warm', moisture: 'normal' },
    },
    'leftShin',
    'rightShin',
    'leftCalf',
    'rightCalf'
  ),
  forRegions(
    {
      visual: {
        description: 'The feet are clean and healthy from heel to arch.',
        skinCondition: 'normal',
      },
      scent: { primary: 'clean feet', intensity: 0.22 },
      texture: { primary: 'smooth', temperature: 'warm', moisture: 'dry' },
    },
    'leftFoot',
    'rightFoot'
  ),
  forRegions(
    {
      visual: {
        description: 'The toes are clean and neatly kept.',
        skinCondition: 'normal',
      },
      scent: { primary: 'clean feet', intensity: 0.23 },
      texture: { primary: 'smooth', temperature: 'warm', moisture: 'dry' },
    },
    'toes'
  )
);

// Gender-specific human defaults provide broad masculine or feminine cues.
const HUMAN_MALE_BASE = mergeMaps(
  forRegions(
    {
      visual: {
        description: 'Masculine features give the face a defined jaw and broader planes.',
        features: ['clean-shaven or light stubble'],
        skinCondition: 'normal',
      },
      scent: { primary: 'warm skin', notes: ['soap', 'salt'], intensity: 0.22 },
      texture: { primary: 'firm', temperature: 'warm', moisture: 'normal' },
      appearance: { facialHair: 'light stubble or clean-shaven' },
    },
    'face'
  ),
  forRegions(
    {
      visual: {
        description: 'Hair tends toward a thicker, slightly coarser texture.',
        features: ['full coverage'],
      },
      scent: { primary: 'clean hair', notes: ['shampoo'], intensity: 0.25 },
      texture: { primary: 'thick', temperature: 'neutral', moisture: 'normal' },
    },
    'hair'
  ),
  forRegions(
    {
      visual: {
        description: 'The neck and throat look sturdy, with healthy skin and easy movement.',
        skinCondition: 'normal',
      },
      scent: { primary: 'warm skin', intensity: 0.22 },
      texture: { primary: 'firm', temperature: 'warm', moisture: 'normal' },
    },
    'neck',
    'throat',
    'nape'
  ),
  forRegions(
    {
      visual: {
        description: 'The shoulders look broader and carry a naturally solid line.',
        skinCondition: 'normal',
      },
      scent: { primary: 'warm skin', intensity: 0.22 },
      texture: { primary: 'firm', temperature: 'warm', moisture: 'normal' },
    },
    'leftShoulder',
    'rightShoulder'
  ),
  forRegions(
    {
      visual: {
        description: 'The chest looks broad and lightly defined.',
        features: ['light natural hair'],
        skinCondition: 'normal',
      },
      scent: { primary: 'warm skin', notes: ['soap'], intensity: 0.25 },
      texture: { primary: 'firm', temperature: 'warm', moisture: 'normal' },
    },
    'chest'
  ),
  forRegions(
    {
      visual: {
        description: 'The arms carry a practical, masculine build.',
        skinCondition: 'normal',
      },
      scent: { primary: 'clean skin', intensity: 0.21 },
      texture: { primary: 'firm', temperature: 'warm', moisture: 'normal' },
    },
    'leftUpperArm',
    'rightUpperArm',
    'leftForearm',
    'rightForearm'
  ),
  forRegions(
    {
      visual: {
        description: 'The hands look broad and capable, with tidy nails.',
        skinCondition: 'normal',
      },
      scent: { primary: 'clean skin', intensity: 0.19 },
      texture: { primary: 'firm', temperature: 'warm', moisture: 'normal' },
    },
    'leftHand',
    'rightHand'
  ),
  forRegions(
    {
      visual: {
        description: 'The thighs and lower legs look strong and practical.',
        skinCondition: 'normal',
      },
      scent: { primary: 'warm skin', intensity: 0.24 },
      texture: { primary: 'firm', temperature: 'warm', moisture: 'normal' },
    },
    'leftThigh',
    'rightThigh',
    'leftCalf',
    'rightCalf',
    'leftShin',
    'rightShin'
  )
);

const HUMAN_MALE_YOUNG_ADULT = mergeMaps(
  forRegions(
    {
      visual: {
        description: 'Youthful masculine features with clear skin and light definition.',
        features: ['light stubble'],
        skinCondition: 'normal',
      },
      scent: { primary: 'warm skin', notes: ['soap'], intensity: 0.21 },
      texture: { primary: 'smooth', temperature: 'warm', moisture: 'normal' },
      appearance: { facialHair: 'light stubble' },
    },
    'face'
  ),
  forRegions(
    {
      visual: {
        description: 'Hair appears full, healthy, and easy to style.',
        features: ['thick at the crown'],
      },
      texture: { primary: 'thick', temperature: 'neutral', moisture: 'normal' },
    },
    'hair'
  ),
  forRegions(
    {
      visual: {
        description: 'The chest and shoulders look taut with youthful tone.',
        skinCondition: 'normal',
      },
      texture: { primary: 'firm', temperature: 'warm', moisture: 'normal' },
    },
    'chest',
    'leftShoulder',
    'rightShoulder'
  ),
  forRegions(
    {
      visual: {
        description: 'The hands remain smooth with only light wear from daily use.',
        skinCondition: 'normal',
      },
      texture: { primary: 'smooth', temperature: 'warm', moisture: 'normal' },
    },
    'leftHand',
    'rightHand'
  )
);

const HUMAN_MALE_ADULT = mergeMaps(
  forRegions(
    {
      visual: {
        description: 'Settled masculine features show a confident, adult profile.',
        features: ['trimmed stubble or a clean shave'],
        skinCondition: 'normal',
      },
      scent: { primary: 'warm skin', notes: ['soap', 'salt'], intensity: 0.24 },
      texture: { primary: 'firm', temperature: 'warm', moisture: 'normal' },
      appearance: { facialHair: 'trimmed stubble or clean-shaven' },
    },
    'face'
  ),
  forRegions(
    {
      visual: {
        description: 'Hair remains dense with a mature, well-kept look.',
        features: ['well-kept hairline'],
      },
      texture: { primary: 'thick', temperature: 'neutral', moisture: 'normal' },
    },
    'hair'
  ),
  forRegions(
    {
      visual: {
        description: 'The hands show light signs of regular work while staying clean.',
        skinCondition: 'normal',
      },
      texture: {
        primary: 'firm',
        temperature: 'warm',
        moisture: 'normal',
        notes: ['light callusing'],
      },
    },
    'leftHand',
    'rightHand'
  )
);

const HUMAN_MALE_MIDDLE_AGED = mergeMaps(
  forRegions(
    {
      visual: {
        description: 'Mature masculine features show laugh lines and a steadier expression.',
        features: ['lines at the eyes'],
        skinCondition: 'normal',
      },
      scent: { primary: 'warm skin', notes: ['soap', 'salt'], intensity: 0.25 },
      texture: { primary: 'firm', temperature: 'warm', moisture: 'normal' },
      appearance: { facialHair: 'trimmed stubble' },
    },
    'face'
  ),
  forRegions(
    {
      visual: {
        description: 'Hair shows slight thinning and a few gray strands at the temples.',
        features: ['slight thinning at the temples'],
      },
      scent: { primary: 'clean hair', notes: ['shampoo'], intensity: 0.24 },
      texture: { primary: 'coarse', temperature: 'neutral', moisture: 'normal' },
      appearance: { hairTone: 'slightly graying' },
    },
    'hair'
  ),
  forRegions(
    {
      visual: {
        description: 'The neck shows natural creases from age without losing strength.',
        skinCondition: 'normal',
      },
      texture: {
        primary: 'firm',
        temperature: 'warm',
        moisture: 'normal',
        notes: ['faint age lines'],
      },
    },
    'neck',
    'throat',
    'nape'
  ),
  forRegions(
    {
      visual: {
        description: 'The hands look experienced, with light wear and tidy knuckles.',
        skinCondition: 'normal',
      },
      texture: {
        primary: 'firm',
        temperature: 'warm',
        moisture: 'dry',
        notes: ['faint calluses'],
      },
    },
    'leftHand',
    'rightHand'
  )
);

const HUMAN_FEMALE_BASE = mergeMaps(
  forRegions(
    {
      visual: {
        description: 'Feminine features soften the face with gentle contours and clear skin.',
        features: ['soft jawline'],
        skinCondition: 'normal',
      },
      scent: { primary: 'clean skin', notes: ['soap'], intensity: 0.18 },
      texture: { primary: 'soft', temperature: 'warm', moisture: 'normal' },
    },
    'face'
  ),
  forRegions(
    {
      visual: {
        description: 'Hair looks soft, healthy, and neatly maintained.',
        features: ['silky sheen'],
      },
      scent: { primary: 'clean hair', notes: ['shampoo'], intensity: 0.23 },
      texture: { primary: 'silky', temperature: 'neutral', moisture: 'normal' },
    },
    'hair'
  ),
  forRegions(
    {
      visual: {
        description: 'The neck and throat look graceful, with healthy skin and gentle lines.',
        skinCondition: 'normal',
      },
      scent: { primary: 'clean skin', notes: ['soap'], intensity: 0.19 },
      texture: { primary: 'soft', temperature: 'warm', moisture: 'normal' },
    },
    'neck',
    'throat',
    'nape'
  ),
  forRegions(
    {
      visual: {
        description: 'The shoulders and chest carry a smooth, naturally balanced line.',
        skinCondition: 'normal',
      },
      scent: { primary: 'warm skin', intensity: 0.21 },
      texture: { primary: 'soft', temperature: 'warm', moisture: 'normal' },
    },
    'leftShoulder',
    'rightShoulder',
    'chest'
  ),
  forRegions(
    {
      visual: {
        description: 'The arms and hands look graceful and carefully kept.',
        skinCondition: 'normal',
      },
      scent: { primary: 'clean skin', intensity: 0.18 },
      texture: { primary: 'soft', temperature: 'warm', moisture: 'normal' },
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
        description: 'The thighs and lower legs show healthy skin with a smooth outline.',
        skinCondition: 'normal',
      },
      scent: { primary: 'warm skin', intensity: 0.21 },
      texture: { primary: 'soft', temperature: 'warm', moisture: 'normal' },
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
        description: 'The feet and toes are clean, well-kept, and naturally soft.',
        skinCondition: 'normal',
      },
      scent: { primary: 'clean feet', intensity: 0.2 },
      texture: { primary: 'soft', temperature: 'warm', moisture: 'dry' },
    },
    'leftFoot',
    'rightFoot',
    'toes'
  )
);

const HUMAN_FEMALE_YOUNG_ADULT = mergeMaps(
  forRegions(
    {
      visual: {
        description: 'Soft, youthful features give the face a fresh and expressive look.',
        features: ['clear skin'],
        skinCondition: 'normal',
      },
      scent: { primary: 'clean skin', notes: ['soap'], intensity: 0.17 },
      texture: { primary: 'velvety', temperature: 'warm', moisture: 'normal' },
    },
    'face'
  ),
  forRegions(
    {
      visual: {
        description: 'Hair appears full, glossy, and easy to style.',
        features: ['healthy shine'],
      },
      texture: { primary: 'silky', temperature: 'neutral', moisture: 'normal' },
    },
    'hair'
  ),
  forRegions(
    {
      visual: {
        description: 'The hands remain soft with little visible wear.',
        skinCondition: 'normal',
      },
      texture: { primary: 'soft', temperature: 'warm', moisture: 'normal' },
    },
    'leftHand',
    'rightHand'
  )
);

const HUMAN_FEMALE_ADULT = mergeMaps(
  forRegions(
    {
      visual: {
        description: 'Adult feminine features look poised and naturally expressive.',
        features: ['settled expression'],
        skinCondition: 'normal',
      },
      scent: { primary: 'clean skin', notes: ['soap'], intensity: 0.19 },
      texture: { primary: 'soft', temperature: 'warm', moisture: 'normal' },
    },
    'face'
  ),
  forRegions(
    {
      visual: {
        description: 'The hands show gentle use while staying well cared for.',
        skinCondition: 'normal',
      },
      texture: {
        primary: 'soft',
        temperature: 'warm',
        moisture: 'normal',
        notes: ['light wear at the fingertips'],
      },
    },
    'leftHand',
    'rightHand'
  )
);

const HUMAN_FEMALE_MIDDLE_AGED = mergeMaps(
  forRegions(
    {
      visual: {
        description: 'Mature feminine features show subtle age lines and an assured expression.',
        features: ['fine lines at the eyes'],
        skinCondition: 'normal',
      },
      scent: { primary: 'clean skin', notes: ['soap'], intensity: 0.2 },
      texture: { primary: 'soft', temperature: 'warm', moisture: 'normal' },
    },
    'face'
  ),
  forRegions(
    {
      visual: {
        description: 'Hair remains healthy with a few subtle silver strands.',
        features: ['subtle silver at the temples'],
      },
      texture: { primary: 'silky', temperature: 'neutral', moisture: 'normal' },
      appearance: { hairTone: 'softly silvering' },
    },
    'hair'
  ),
  forRegions(
    {
      visual: {
        description: 'The neck and hands show light signs of age while staying carefully kept.',
        skinCondition: 'normal',
      },
      texture: {
        primary: 'soft',
        temperature: 'warm',
        moisture: 'normal',
        notes: ['faint age lines'],
      },
    },
    'neck',
    'throat',
    'nape',
    'leftHand',
    'rightHand'
  )
);

export const HUMAN_DEFAULTS: ClassificationDefaultMap = {
  '*': {
    '*': HUMAN_NEUTRAL_DEFAULTS,
  },
  male: {
    '*': HUMAN_MALE_BASE,
    'young-adult': HUMAN_MALE_YOUNG_ADULT,
    adult: HUMAN_MALE_ADULT,
    'middle-aged': HUMAN_MALE_MIDDLE_AGED,
  },
  female: {
    '*': HUMAN_FEMALE_BASE,
    'young-adult': HUMAN_FEMALE_YOUNG_ADULT,
    adult: HUMAN_FEMALE_ADULT,
    'middle-aged': HUMAN_FEMALE_MIDDLE_AGED,
  },
};
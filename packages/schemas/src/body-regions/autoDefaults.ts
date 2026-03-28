import { getRecordOptional, setPartialRecord } from '../shared/record-helpers.js';
import type { CharacterProfile } from '../character/characterProfile.js';
import type { BodyMap } from '../character/body-map.js';
import type { BodyRegion } from './regions.js';
import { BODY_REGIONS } from './regions.js';
import { DEFAULT_SCENTS } from '../character/scent/default-scents.js';
import {
  getClassificationDefaults,
  resolveAgeBucket,
  resolveClassificationDefaults,
  type ClassificationContext,
} from './classification-defaults/index.js';

const NEUTRAL_SCENT = {
  primary: 'neutral',
  intensity: 0.2,
} as const;

export function buildAutoDefaults(
  profile: Partial<CharacterProfile>,
  excludeRegions: string[] | undefined
): BodyMap {
  const excluded = new Set(excludeRegions ?? []);
  const result: BodyMap = {};

  const context: ClassificationContext = {
    race: profile.race ?? 'Human',
    ageBucket: resolveAgeBucket(profile.age),
    ...(profile.gender !== undefined ? { gender: profile.gender } : {}),
    ...(profile.subrace !== undefined ? { subrace: profile.subrace } : {}),
  };

  const classificationDefaults = resolveClassificationDefaults(
    context,
    getClassificationDefaults(context.race)
  );

  for (const [region, data] of Object.entries(classificationDefaults)) {
    if (excluded.has(region) || !data) continue;

    setPartialRecord(result, region as BodyRegion, data);
  }

  for (const region of BODY_REGIONS) {
    if (excluded.has(region)) continue;
    if (getRecordOptional(result, region)?.scent) continue;

    const scent = getRecordOptional(DEFAULT_SCENTS, region) ?? NEUTRAL_SCENT;
    const notes = 'notes' in scent ? scent.notes : undefined;
    setPartialRecord(result, region, {
      ...getRecordOptional(result, region),
      scent: {
        primary: scent.primary,
        intensity: scent.intensity,
        ...(notes ? { notes } : {}),
      },
    });
  }

  return result;
}

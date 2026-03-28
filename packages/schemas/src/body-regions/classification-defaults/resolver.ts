import type { BodyRegion } from '../regions.js';
import type { BodyRegionData } from '../sensory-types.js';
import type { ClassificationContext, ClassificationDefaultMap } from './types.js';

type PartialBodyMap = Partial<Record<BodyRegion, Partial<BodyRegionData>>>;

/**
 * Merge source region data into target, with source winning on conflicts.
 */
function mergeRegionData(
  target: Partial<BodyRegionData>,
  source: Partial<BodyRegionData>
): Partial<BodyRegionData> {
  return {
    ...target,
    ...source,
    ...(source.visual ? { visual: { ...target.visual, ...source.visual } } : {}),
    ...(source.scent ? { scent: { ...target.scent, ...source.scent } } : {}),
    ...(source.texture ? { texture: { ...target.texture, ...source.texture } } : {}),
    ...(source.flavor ? { flavor: { ...target.flavor, ...source.flavor } } : {}),
    ...(source.appearance
      ? { appearance: { ...target.appearance, ...source.appearance } }
      : {}),
  };
}

function mergeBodyMaps(base: PartialBodyMap, overlay: PartialBodyMap): PartialBodyMap {
  const result: PartialBodyMap = { ...base };

  for (const [region, data] of Object.entries(overlay)) {
    if (!data) continue;

    const key = region as BodyRegion;
    const existing = result[key];
    result[key] = existing ? mergeRegionData(existing, data) : data;
  }

  return result;
}

/**
 * Resolve classification defaults with fallback chain:
 * 1. raceDefaults['*']['*']
 * 2. raceDefaults[gender]['*']
 * 3. raceDefaults[gender][ageBucket]
 *
 * Results are merged with more specific layers overriding less specific ones.
 */
export function resolveClassificationDefaults(
  context: ClassificationContext,
  raceDefaults: ClassificationDefaultMap | undefined
): PartialBodyMap {
  if (!raceDefaults) return {};

  let result: PartialBodyMap = {};

  const raceWildcard = raceDefaults['*'];
  if (raceWildcard) {
    const ageWildcard = raceWildcard['*'];
    if (ageWildcard) {
      result = mergeBodyMaps(result, ageWildcard);
    }
  }

  const gender = context.gender ?? '*';
  if (gender !== '*') {
    const genderBucket = raceDefaults[gender];
    if (genderBucket) {
      const ageWildcard = genderBucket['*'];
      if (ageWildcard) {
        result = mergeBodyMaps(result, ageWildcard);
      }

      const ageBucket = genderBucket[context.ageBucket];
      if (ageBucket) {
        result = mergeBodyMaps(result, ageBucket);
      }
    }
  }

  return result;
}
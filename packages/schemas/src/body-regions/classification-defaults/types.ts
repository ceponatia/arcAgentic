import type { BodyRegionData } from '../sensory-types.js';
import type { BodyRegion } from '../regions.js';

export const AGE_BUCKETS = [
  'child',
  'adolescent',
  'young-adult',
  'adult',
  'middle-aged',
  'elderly',
] as const;

export type AgeBucket = (typeof AGE_BUCKETS)[number];

export interface ClassificationContext {
  race: string;
  gender?: string;
  ageBucket: AgeBucket;
  subrace?: string;
}

/**
 * Classification default map structure:
 * gender -> ageBucket -> partial BodyMap
 * Use '*' as wildcard for gender-neutral or age-neutral fallback.
 */
export type ClassificationDefaultMap = Record<
  string,
  Record<string, Partial<Record<BodyRegion, Partial<BodyRegionData>>>>
>;

export function resolveAgeBucket(age: number | undefined): AgeBucket {
  if (age === undefined) return 'adult';
  if (age <= 12) return 'child';
  if (age <= 17) return 'adolescent';
  if (age <= 29) return 'young-adult';
  if (age <= 49) return 'adult';
  if (age <= 69) return 'middle-aged';
  return 'elderly';
}
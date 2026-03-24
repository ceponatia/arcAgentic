/**
 * Loader for sensory modifiers data file.
 *
 * This module loads and validates the sensory-modifiers.json file which contains:
 * - Body part sensory modifiers for smell/touch/taste at each hygiene level
 * - Decay rate configurations (thresholds and base decay per turn)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from '@arcagentic/logger';
import {
  SensoryModifiersDataSchema,
  getSensoryModifierByLevel,
  getRecordOptional,
  type LoadedSensoryModifiers,
  type SensoryModifiersData,
  type HygieneLevel,
} from '@arcagentic/schemas';
import { resolveDataDir } from './loader.js';

const SENSORY_MODIFIERS_FILE = 'sensory-modifiers.json';
const log = createLogger('api', 'data');

function safeGetModifier(
  data: SensoryModifiersData,
  bodyPart: string,
  senseType: 'smell' | 'touch' | 'taste',
  level: HygieneLevel
): string {
  const partModifiers = getRecordOptional(data.bodyParts, bodyPart);
  if (!partModifiers) return '';

  const senseModifiers = getRecordOptional(partModifiers, senseType);
  if (!senseModifiers) return '';

  return getSensoryModifierByLevel(senseModifiers, level);
}

/**
 * Load and validate sensory modifiers data.
 */
export async function loadSensoryModifiers(dataDir?: string): Promise<LoadedSensoryModifiers> {
  const base = resolveDataDir(dataDir);
  const filePath = path.join(base, SENSORY_MODIFIERS_FILE);

  let raw: string;
  try {
    raw = await fs.promises.readFile(filePath, 'utf-8');
  } catch (err) {
    log.error({ err, filePath }, 'failed to read sensory modifiers file');
    throw new Error(`Sensory modifiers file not found: ${filePath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    log.error({ err, filePath }, 'failed to parse sensory modifiers json');
    throw new Error(`Invalid JSON in sensory modifiers file: ${filePath}`);
  }

  const result = SensoryModifiersDataSchema.safeParse(parsed);
  if (!result.success) {
    log.error({ error: result.error.flatten(), filePath }, 'sensory modifiers validation failed');
    throw new Error(`Invalid sensory modifiers data: ${result.error.message}`);
  }

  const data = result.data;

  return {
    data,
    bodyParts: data.bodyParts,
    decayRates: data.decayRates,
    getModifier: (bodyPart, senseType, level) => safeGetModifier(data, bodyPart, senseType, level),
  };
}

/**
 * Synchronously load sensory modifiers (for startup validation).
 */
export function loadSensoryModifiersSync(dataDir?: string): LoadedSensoryModifiers {
  const base = resolveDataDir(dataDir);
  const filePath = path.join(base, SENSORY_MODIFIERS_FILE);

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    log.error({ err, filePath }, 'failed to read sensory modifiers file');
    throw new Error(`Sensory modifiers file not found: ${filePath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    log.error({ err, filePath }, 'failed to parse sensory modifiers json');
    throw new Error(`Invalid JSON in sensory modifiers file: ${filePath}`);
  }

  const result = SensoryModifiersDataSchema.safeParse(parsed);
  if (!result.success) {
    log.error({ error: result.error.flatten(), filePath }, 'sensory modifiers validation failed');
    throw new Error(`Invalid sensory modifiers data: ${result.error.message}`);
  }

  const data = result.data;

  return {
    data,
    bodyParts: data.bodyParts,
    decayRates: data.decayRates,
    getModifier: (bodyPart, senseType, level) => safeGetModifier(data, bodyPart, senseType, level),
  };
}

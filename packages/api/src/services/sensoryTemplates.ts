import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger } from '@arcagentic/logger';
import {
  SensoryTemplateSchema,
  type SensoryTemplate,
  getSensoryTemplates,
} from '@arcagentic/schemas';

const log = createLogger('api', 'sensory');

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..', '..', '..');
const TEMPLATE_DIR = path.join(
  repoRoot,
  'packages',
  'schemas',
  'src',
  'body-regions',
  'templates-json'
);
const SCAN_INTERVAL_MS = 5000;

let cachedTemplates: SensoryTemplate[] = [];
let lastScan = 0;

function readTemplatesFromDisk(): SensoryTemplate[] {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    return [];
  }

  const entries = fs
    .readdirSync(TEMPLATE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(TEMPLATE_DIR, entry.name));

  const templates: SensoryTemplate[] = [];

  for (const filePath of entries) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed: unknown = JSON.parse(raw);
      const result = SensoryTemplateSchema.safeParse(parsed);
      if (!result.success) {
        log.warn({ filePath, error: result.error }, 'invalid sensory template json');
        continue;
      }
      templates.push(result.data);
    } catch (error) {
      log.warn({ err: error, filePath }, 'failed to load sensory template json');
    }
  }

  return templates.sort((a, b) => a.id.localeCompare(b.id));
}

function refreshCacheIfNeeded(): void {
  const now = Date.now();
  if (now - lastScan < SCAN_INTERVAL_MS) return;
  lastScan = now;

  try {
    const templates = readTemplatesFromDisk();
    cachedTemplates = templates.length > 0 ? templates : cachedTemplates;
  } catch (error) {
    log.warn({ err: error }, 'failed to scan sensory templates');
  }
}

/**
 * Returns templates from JSON with periodic refresh. Falls back to static templates.
 */
export function getLiveSensoryTemplates(): SensoryTemplate[] {
  refreshCacheIfNeeded();

  if (cachedTemplates.length > 0) {
    return cachedTemplates;
  }

  return getSensoryTemplates();
}

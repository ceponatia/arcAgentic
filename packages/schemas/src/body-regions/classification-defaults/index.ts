export * from './types.js';
export { resolveClassificationDefaults } from './resolver.js';
export { HUMAN_DEFAULTS } from './human.js';
export { ELF_DEFAULTS } from './elf.js';

import type { ClassificationDefaultMap } from './types.js';
import { HUMAN_DEFAULTS } from './human.js';
import { ELF_DEFAULTS } from './elf.js';

const CLASSIFICATION_REGISTRY: Record<string, ClassificationDefaultMap> = {
  Human: HUMAN_DEFAULTS,
  Elf: ELF_DEFAULTS,
};

export function getClassificationDefaults(
  race: string
): ClassificationDefaultMap | undefined {
  for (const [classification, defaults] of Object.entries(CLASSIFICATION_REGISTRY)) {
    if (classification === race) {
      return defaults;
    }
  }

  return undefined;
}

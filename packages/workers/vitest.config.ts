import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vitest/config';
import baseConfig from '../../config/vitest/base.ts';

export default mergeConfig(baseConfig, {
  test: {
    coverage: {
      thresholds: { statements: 75, branches: 75, functions: 75, lines: 75 },
    },
  },
  resolve: {
    alias: {
      '@arcagentic/schemas': fileURLToPath(new URL('../schemas/src/index.ts', import.meta.url)),
    },
  },
});

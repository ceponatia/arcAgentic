import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vitest/config';
import baseConfig from '../../config/vitest/base.ts';

export default mergeConfig(baseConfig, {
  test: {
    coverage: {
      thresholds: { statements: 30, branches: 0, functions: 10, lines: 30 },
    },
  },
  resolve: {
    alias: {
      '@arcagentic/schemas': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
    },
  },
});

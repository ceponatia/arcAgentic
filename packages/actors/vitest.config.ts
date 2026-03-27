import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vitest/config';
import baseConfig from '../../config/vitest/base.ts';

export default mergeConfig(baseConfig, {
  resolve: {
    alias: {
      '@arcagentic/bus': fileURLToPath(new URL('../bus/src/index.ts', import.meta.url)),
      '@arcagentic/llm': fileURLToPath(new URL('../llm/src/index.ts', import.meta.url)),
      '@arcagentic/schemas': fileURLToPath(new URL('../schemas/src/index.ts', import.meta.url)),
    },
  },
  test: {
    coverage: {
      thresholds: { statements: 75, branches: 65, functions: 75, lines: 75 },
    },
  },
});

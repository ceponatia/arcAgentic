import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vitest/config';
import baseConfig from '../../config/vitest/base.ts';

export default mergeConfig(baseConfig, {
  resolve: {
    alias: {
      '@arcagentic/schemas': fileURLToPath(new URL('../schemas/src/index.ts', import.meta.url)),
    },
  },
});

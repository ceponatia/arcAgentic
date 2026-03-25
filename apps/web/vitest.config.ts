import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../config/vitest/base.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const resolveFromRoot = (relativePath: string) => resolve(__dirname, relativePath);

export default mergeConfig(baseConfig, defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
    coverage: {
      thresholds: { statements: 65, branches: 50, functions: 65, lines: 65 },
    },
  },
  resolve: {
    alias: {
      '@arcagentic/schemas': resolveFromRoot('../../packages/schemas/src'),
      '@arcagentic/ui': resolveFromRoot('../../packages/ui/src'),
      '@arcagentic/utils': resolveFromRoot('../../packages/utils/src'),
    },
  },
}));

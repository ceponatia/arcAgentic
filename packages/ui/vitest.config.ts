import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../config/vitest/base.ts';

export default mergeConfig(baseConfig, defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      thresholds: { statements: 70, branches: 70, functions: 65, lines: 70 },
    },
  },
}));

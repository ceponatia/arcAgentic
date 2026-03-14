import { defineConfig } from 'vitest/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const resolveFromRoot = (relativePath: string) => resolve(__dirname, relativePath);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@arcagentic/schemas': resolveFromRoot('../../packages/schemas/src'),
      '@arcagentic/ui': resolveFromRoot('../../packages/ui/src'),
      '@arcagentic/utils': resolveFromRoot('../../packages/utils/src'),
    },
  },
});

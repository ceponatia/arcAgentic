import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';
import tseslint from 'typescript-eslint';

const tsconfigRootDir = fileURLToPath(new URL('../..', import.meta.url));

const toolingFiles = [
  '*.config.{ts,js,cjs,mjs}',
  'vite.config.ts',
  'packages/*/*.config.{ts,js,cjs,mjs}',
  'packages/*/vite.config.ts',
  'apps/*/*.config.{ts,js,cjs,mjs}',
  'apps/*/vite.config.ts',
];

const sourceFiles = [
  'src/**/*.{ts,tsx,js}',
  'packages/*/src/**/*.{ts,tsx,js}',
  'apps/*/src/**/*.{ts,tsx,js}',
];

const reactFiles = [
  'src/**/*.{ts,tsx}',
  'packages/*/src/**/*.{ts,tsx}',
  'apps/*/src/**/*.{ts,tsx}',
];

const testFiles = [
  'test/**/*.{ts,tsx,js}',
  'src/**/*.{test,spec}.{ts,tsx,js}',
  'src/**/__tests__/**/*.{ts,tsx,js}',
  'packages/*/test/**/*.{ts,tsx,js}',
  'packages/*/src/**/*.{test,spec}.{ts,tsx,js}',
  'packages/*/src/**/__tests__/**/*.{ts,tsx,js}',
  'apps/*/test/**/*.{ts,tsx,js}',
  'apps/*/src/**/*.{test,spec}.{ts,tsx,js}',
  'apps/*/src/**/__tests__/**/*.{ts,tsx,js}',
];

export const portableImportPatterns = [
  {
    group: ['@*/*/src/*', '@*/*/src/**'],
    message:
      'Import from package root or explicit subpath exports, not /src/ internals.',
  },
  {
    group: ['@*/*/dist/*', '@*/*/dist/**', '!@*/*/dist/*.css', '!@*/*/dist/**/*.css'],
    message:
      'Import from package root or explicit subpath exports, not /dist/ internals.',
  },
];

const sharedRules = {
  'security/detect-object-injection': 'warn',
  'no-restricted-imports': [
    'error',
    {
      patterns: portableImportPatterns,
    },
  ],
  'no-console': [
    'warn',
    {
      allow: ['warn', 'error', 'info', 'debug'],
    },
  ],
  'no-restricted-syntax': [
    'warn',
    {
      selector: 'MemberExpression[object.object.name="process"][object.property.name="env"]',
      message:
        'Access process.env only in config modules (config.ts, env.ts, settings.ts). Import config values instead.',
    },
  ],
};

export const tsConfig = tseslint.config(
  {
    files: toolingFiles,
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
    ],
  },
  {
    files: sourceFiles,
    plugins: {
      security,
    },
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: sharedRules,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir,
      },
    },
  },
);

export const reactConfig = [
  {
    files: reactFiles,
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];

export const testConfig = tseslint.config(
  {
    files: testFiles,
    plugins: {
      security,
    },
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: sharedRules,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir,
      },
      globals: {
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
      },
    },
  },
);
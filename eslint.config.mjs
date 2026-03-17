import eslintConfigPrettier from 'eslint-config-prettier';
import {
  portableImportPatterns,
  reactConfig,
  testConfig,
  tsConfig,
  sourceFiles,
  testFiles,
} from './config/eslint/base.mjs';
import arcagentic from './config/eslint/arcAgentic-eslint-plugin.mjs';

const monorepoImportPatterns = [
  {
    group: ['../../packages/*', '../../packages/**'],
    message: 'Use @arcagentic/* imports for cross-package dependencies.',
  },
  {
    group: ['../../../packages/*', '../../../packages/**'],
    message: 'Use @arcagentic/* imports for cross-package dependencies.',
  },
  {
    group: ['../../../../packages/*', '../../../../packages/**'],
    message: 'Use @arcagentic/* imports for cross-package dependencies.',
  },
];

const sourceAndTestImportRules = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [...portableImportPatterns, ...monorepoImportPatterns],
    },
  ],
};


const sharedArcagenticRules = {
  'arcagentic/no-duplicate-exported-types': [
    'error',
    {
      repoRoot: import.meta.dirname,
      ignoreTypeNames: [],
    },
  ],
  'arcagentic/package-layer-boundaries': [
    'error',
    {
      allowSameLevel: false,
    },
  ],
  'arcagentic/schemas-only-in-schemas-package': [
    'error',
    {
      repoRoot: import.meta.dirname,
    },
  ],
};

export default [
  ...tsConfig,
  ...reactConfig,
  ...testConfig,
  {
    files: sourceFiles,
    plugins: {
      arcagentic,
    },
    rules: {
      ...sharedArcagenticRules,
      ...sourceAndTestImportRules,
    },
  },
  {
    files: testFiles,
    plugins: {
      arcagentic,
    },
    rules: {
      ...sharedArcagenticRules,
      ...sourceAndTestImportRules,
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx,js}'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
      },
    },
  },
  {
    files: [
      'packages/schemas/src/**/*.ts',
      'packages/utils/src/**/*.ts',
      'packages/bus/src/**/*.ts',
      'packages/llm/src/**/*.ts',
      'packages/generator/src/**/*.ts',
      'packages/characters/src/**/*.ts',
      'packages/actors/src/**/*.ts',
      'packages/ui/src/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@arcagentic/db',
              message:
                'This package should not import @arcagentic/db directly. Use @arcagentic/services or @arcagentic/retrieval instead.',
            },
          ],
          patterns: [
            {
              group: ['@arcagentic/db/*', '@arcagentic/db/**'],
              message:
                'This package should not import @arcagentic/db directly. Use services/retrieval layer.',
            },
            ...portableImportPatterns,
            ...monorepoImportPatterns,
          ],
        },
      ],
    },
  },
  {
    files: [
      'packages/*/src/**/config.ts',
      'packages/*/src/**/config/*.ts',
      'packages/*/src/**/env.ts',
      'packages/*/src/**/settings.ts',
      'apps/*/src/**/config.ts',
      'apps/*/src/**/config/*.ts',
      'apps/*/src/**/env.ts',
      'apps/*/src/**/settings.ts',
      'packages/api/src/index.ts',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  eslintConfigPrettier,
];

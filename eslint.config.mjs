import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import security from 'eslint-plugin-security';
import arcagentic from './config/eslint/arcagentic-eslint-plugin.mjs';

export default tseslint.config(
  // Tooling/config files inside packages (no type-aware linting)
  {
    files: [
      'packages/*/*.config.{ts,js,cjs,mjs}',
      'packages/*/vitest.config.ts',
      'packages/*/vite.config.ts',
      'packages/*/tsup.config.ts',
      'packages/*/tsup.config.*.{ts,js,cjs,mjs}',
    ],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
    ],
  },
  // TypeScript + JS rules for source files across packages
  {
    files: ['packages/*/src/**/*.{ts,tsx,js}'],
    plugins: {
      arcagentic,
      security,
    },
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      // Match Codacy's "Detect Object Injection"
      'security/detect-object-injection': 'warn',

      // Cross-package type consolidation enforcement
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

      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@arcagentic/*/src/*', '@arcagentic/*/src/**'],
              message:
                'Import from package root (@arcagentic/pkg) or explicit subpath exports, not /src/ internals.',
            },
            {
              group: ['@arcagentic/*/dist/*', '@arcagentic/*/dist/**'],
              message:
                'Import from package root (@arcagentic/pkg) or explicit subpath exports, not /dist/ internals.',
            },
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
          ],
        },
      ],

      // Discourage console.log - use structured logging
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error', 'info', 'debug'],
        },
      ],

      'no-restricted-syntax': [
        'warn',
        {
          selector:
            'MemberExpression[object.object.name="process"][object.property.name="env"]',
          message:
            'Access process.env only in config modules (config.ts, env.ts, settings.ts). Import config values instead.',
        },
      ],
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // TypeScript + JS rules for test files across packages
  {
    files: [
      'packages/*/test/**/*.{ts,tsx,js}',
      'packages/*/src/**/*.{test,spec}.{ts,tsx,js}',
      'packages/*/src/**/__tests__/**/*.{ts,tsx,js}',
    ],
    plugins: {
      arcagentic,
      security,
    },
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      'security/detect-object-injection': 'warn',
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
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@arcagentic/*/src/*', '@arcagentic/*/src/**'],
              message:
                'Import from package root (@arcagentic/pkg) or explicit subpath exports, not /src/ internals.',
            },
            {
              group: ['@arcagentic/*/dist/*', '@arcagentic/*/dist/**'],
              message:
                'Import from package root (@arcagentic/pkg) or explicit subpath exports, not /dist/ internals.',
            },
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
          ],
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
          selector:
            'MemberExpression[object.object.name="process"][object.property.name="env"]',
          message:
            'Access process.env only in config modules (config.ts, env.ts, settings.ts). Import config values instead.',
        },
      ],
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
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
  // Restrict direct @arcagentic/db imports in specific packages
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
            {
              group: ['@arcagentic/*/src/*', '@arcagentic/*/src/**'],
              message:
                'Import from package root (@arcagentic/pkg) or explicit subpath exports, not /src/ internals.',
            },
            {
              group: ['@arcagentic/*/dist/*', '@arcagentic/*/dist/**'],
              message:
                'Import from package root (@arcagentic/pkg) or explicit subpath exports, not /dist/ internals.',
            },
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
          ],
        },
      ],
    },
  },
  // Config files can use process.env
  {
    files: [
      'packages/*/src/**/config.ts',
      'packages/*/src/**/config/*.ts',
      'packages/*/src/**/env.ts',
      'packages/*/src/**/settings.ts',
      'packages/api/src/index.ts',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  // Disable formatting rules to let Prettier handle formatting
  eslintConfigPrettier
);

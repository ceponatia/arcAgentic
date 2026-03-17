import fs from 'node:fs';
import path from 'node:path';

import eslintConfigPrettier from 'eslint-config-prettier';
import { globSync } from 'glob';
import ts from 'typescript';
import {
  portableImportPatterns,
  reactConfig,
  testConfig,
  tsConfig,
  sourceFiles,
  testFiles,
} from './config/eslint/base.mjs';
import packageLayerBoundaries from './config/eslint/rules/package-layer-boundaries.mjs';
import schemasOnlyInSchemasPackage from './config/eslint/rules/schemas-only-in-schemas-package.mjs';

/**
 * @typedef {object} ExportedTypeDefinition
 * @property {string} name
 * @property {'type'|'interface'|'enum'} kind
 * @property {string} filePath
 * @property {string} packageName
 */

/**
 * @typedef {object} DuplicateTypeFinding
 * @property {string} name
 * @property {ExportedTypeDefinition[]} definitions
 */

/**
 * @param {ts.Node} node
 * @returns {boolean}
 */
function hasExportModifier(node) {
  const modifiers = /** @type {readonly ts.Modifier[] | undefined} */ (node.modifiers);
  return Boolean(modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

/**
 * @param {string} repoRoot
 * @param {string} filePath
 * @returns {string | null}
 */
function getPackageName(repoRoot, filePath) {
  const rel = path.relative(repoRoot, filePath);
  const parts = rel.split(path.sep);
  if (parts.length >= 2 && parts[0] === 'packages') return parts[1] ?? null;
  return null;
}

/**
 * @param {string} filePath
 * @returns {ts.SourceFile}
 */
function parseSourceFile(filePath) {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind);
}

/**
 * @param {string} repoRoot
 * @param {string} filePath
 * @returns {ExportedTypeDefinition[]}
 */
function getExportedTypeDefinitions(repoRoot, filePath) {
  const packageName = getPackageName(repoRoot, filePath);
  if (!packageName) return [];

  const sourceFile = parseSourceFile(filePath);

  /** @type {ExportedTypeDefinition[]} */
  const definitions = [];

  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) continue;

    if (ts.isTypeAliasDeclaration(statement)) {
      definitions.push({
        name: statement.name.text,
        kind: 'type',
        filePath,
        packageName,
      });
      continue;
    }

    if (ts.isInterfaceDeclaration(statement)) {
      definitions.push({
        name: statement.name.text,
        kind: 'interface',
        filePath,
        packageName,
      });
      continue;
    }

    if (ts.isEnumDeclaration(statement)) {
      definitions.push({
        name: statement.name.text,
        kind: 'enum',
        filePath,
        packageName,
      });
    }
  }

  return definitions;
}

/**
 * @param {string} repoRoot
 * @param {string[]} ignoreTypeNames
 * @returns {Map<string, DuplicateTypeFinding>}
 */
function scanDuplicateExportedTypes(repoRoot, ignoreTypeNames) {
  /** @type {Map<string, Map<string, ExportedTypeDefinition[]>>} */
  const byName = new Map();

  const files = globSync('packages/*/src/**/*.{ts,tsx}', {
    cwd: repoRoot,
    absolute: true,
  });

  for (const filePath of files) {
    const definitions = getExportedTypeDefinitions(repoRoot, filePath);
    for (const definition of definitions) {
      if (ignoreTypeNames.includes(definition.name)) continue;

      const perPackage = byName.get(definition.name) ?? new Map();
      const existing = perPackage.get(definition.packageName) ?? [];
      existing.push(definition);
      perPackage.set(definition.packageName, existing);
      byName.set(definition.name, perPackage);
    }
  }

  /** @type {Map<string, DuplicateTypeFinding>} */
  const duplicates = new Map();

  for (const [name, perPackage] of byName.entries()) {
    if (perPackage.size <= 1) continue;

    /** @type {ExportedTypeDefinition[]} */
    const definitions = [];
    for (const packageDefinitions of perPackage.values()) {
      definitions.push(...packageDefinitions);
    }

    duplicates.set(name, { name, definitions });
  }

  return duplicates;
}

/** @type {Map<string, Map<string, DuplicateTypeFinding>>} */
const duplicateTypeCache = new Map();

/**
 * @param {string} repoRoot
 * @param {string[]} ignoreTypeNames
 * @returns {Map<string, DuplicateTypeFinding>}
 */
function getDuplicateTypes(repoRoot, ignoreTypeNames) {
  const cacheKey = `${repoRoot}::${ignoreTypeNames.join(',')}`;
  const cached = duplicateTypeCache.get(cacheKey);
  if (cached) return cached;

  const scanned = scanDuplicateExportedTypes(repoRoot, ignoreTypeNames);
  duplicateTypeCache.set(cacheKey, scanned);
  return scanned;
}

const arcagentic = {
  rules: {
    'no-duplicate-exported-types': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow exporting type/interface/enum definitions with the same name from multiple packages',
        },
        schema: [
          {
            type: 'object',
            properties: {
              repoRoot: { type: 'string' },
              ignoreTypeNames: { type: 'array', items: { type: 'string' }, default: [] },
            },
            additionalProperties: false,
          },
        ],
        messages: {
          duplicate:
            "Exported {{kind}} '{{name}}' is also defined in other packages: {{others}}. Canonicalize in @arcagentic/schemas and derive package-specific variants via Pick/Omit.",
        },
      },
      /**
       * @param {import('eslint').Rule.RuleContext} context
       * @returns {import('eslint').Rule.RuleListener}
       */
      create(context) {
        const filename = context.filename;
        if (!filename.endsWith('.ts') && !filename.endsWith('.tsx')) return {};

        const options = (context.options && context.options[0]) || {};
        const repoRoot = typeof options.repoRoot === 'string' ? options.repoRoot : process.cwd();
        const ignoreTypeNames = Array.isArray(options.ignoreTypeNames) ? options.ignoreTypeNames : [];
        const duplicates = getDuplicateTypes(repoRoot, ignoreTypeNames);
        const currentPackage = getPackageName(repoRoot, filename);

        if (!currentPackage) return {};

        /**
         * @param {unknown} node
         * @returns {node is import('estree').ExportNamedDeclaration}
         */
        function isExportNamedDeclaration(node) {
          return Boolean(node) && typeof node === 'object' && 'type' in node && node.type === 'ExportNamedDeclaration';
        }

        return {
          Program() {
            const ast = context.getSourceCode().ast;

            for (const statement of ast.body) {
              if (!isExportNamedDeclaration(statement)) continue;
              if (!statement.declaration) continue;

              const declaration = statement.declaration;
              const isTypeAlias = declaration.type === 'TSTypeAliasDeclaration';
              const isInterface = declaration.type === 'TSInterfaceDeclaration';
              const isEnum = declaration.type === 'TSEnumDeclaration';
              if (!isTypeAlias && !isInterface && !isEnum) continue;

              const identifier = declaration.id;
              if (!identifier || identifier.type !== 'Identifier') continue;

              const name = identifier.name;
              const finding = duplicates.get(name);
              if (!finding) continue;

              const others = finding.definitions
                .filter((definition) => definition.packageName !== currentPackage)
                .map(
                  (definition) =>
                    `${definition.packageName} (${path.relative(repoRoot, definition.filePath)})`,
                );

              if (others.length === 0) continue;

              context.report({
                node: identifier,
                messageId: 'duplicate',
                data: {
                  kind: isTypeAlias ? 'type' : isInterface ? 'interface' : 'enum',
                  name,
                  others: others.join(', '),
                },
              });
            }
          },
        };
      },
    },
    'package-layer-boundaries': packageLayerBoundaries,
    'schemas-only-in-schemas-package': schemasOnlyInSchemasPackage,
  },
};

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

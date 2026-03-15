# ESLint Base Config

`base.mjs` contains the portable ESLint layers that are useful outside this monorepo:

- JavaScript and TypeScript recommended config for tooling files and source files
- Type-aware TypeScript rules for source and test files
- `eslint-plugin-security` setup
- shared `no-console`, `process.env`, and package deep-import hygiene rules
- React hooks rules in a separate export
- test globals in a separate export

The file intentionally avoids monorepo-only imports and rules. It does not import the local `arcagentic` ESLint plugin, and it does not depend on any `@arcagentic/*` package.

## Fork Usage

Copy `config/eslint/base.mjs` into the forked package or app, then compose the exports you need in that package's `eslint.config.mjs`.

```javascript
import { reactConfig, testConfig, tsConfig } from './config/eslint/base.mjs';

export default [...tsConfig, ...reactConfig, ...testConfig];
```

For a non-React package, omit `reactConfig`.

## Intentionally Excluded

These rules stay in the root monorepo orchestrator because they depend on repo-specific architecture or paths:

- `arcagentic/no-duplicate-exported-types`
- `arcagentic/package-layer-boundaries`
- `arcagentic/schemas-only-in-schemas-package`
- `@arcagentic/db` leaf-package import restrictions
- browser globals for `apps/web`
- config-file overrides that allow `process.env`
- Prettier integration for the monorepo root config

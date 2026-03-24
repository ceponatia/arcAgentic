# Testing Conventions

## Overview

arcagentic uses Vitest 4.x for all automated tests. The default workflow is package-local so contributors can validate changes at the narrowest useful scope:

- `pnpm --dir <package> run test`
- `turbo run test`

Use package-local runs while developing and reserve repo-wide runs for broader verification.

## Test Placement

### Backend and library packages

Tests live in `test/` at the package root:

- `packages/<name>/test/**/*.test.ts`
- `packages/<name>/test/**/*.integration.test.ts`

This applies to backend and library packages such as `schemas`, `bus`, `services`, `actors`, `api`, `generator`, `db`, `workers`, and `utils`.

### Web application (`apps/web`)

Tests are co-located with source under `src/`:

- `apps/web/src/**/*.test.ts`
- `apps/web/src/**/*.test.tsx`

Co-located tests are the default for the web app because they keep component, hook, and feature coverage close to the code being exercised.

### UI component library (`packages/ui`)

Tests live in `test/` at the package root:

- `packages/ui/test/**/*.test.tsx`

## File Naming

- `*.test.ts` / `*.test.tsx` - unit and component tests
- `*.integration.test.ts` / `*.integration.test.tsx` - narrow multi-module integration tests

Integration tests remain package-local. They may wire together multiple modules inside a package or use mocked adjacent packages, but they do not span the network or require external services.

## Shared Test Helpers

Shared builders, mock factories, and request helpers live under `config/vitest/`:

```text
config/vitest/
  test-utils.ts          # Stable public entry point
  builders/              # Schema-valid domain object factories
  mocks/                 # Package boundary mock factories
  hono/                  # Hono app and request helpers for API tests
```

Import from the public entry point:

```ts
import { buildCharacterProfile, mockBus, jsonRequest } from '../../config/vitest/test-utils.js';
```

Or import specifically:

```ts
import { buildCharacterProfile } from '../../config/vitest/builders/character-profile.js';
```

### Builders

Builders return schema-valid objects with sensible defaults. Override only the fields relevant to your test:

```ts
const profile = buildCharacterProfile({ name: 'Custom NPC', tier: 'minor' });
```

Available builders: `buildCharacterProfile`, `buildSessionState`, `buildLocationsState`, `buildNpcsState`, `buildNpcActorState`, `buildMoveIntent`, `buildSpeakIntent`, `buildMovedEffect`, `buildSpokeEffect`, `buildTickEvent`, `buildSessionStartEvent`, `buildActorSpawnEvent`.

### Mock Factories

Mock factories target package boundaries, not deep internals:

```ts
const bus = mockBus();
const db = mockDb();
const llm = mockLlmProvider();
const redis = mockRedis();
```

Each factory returns typed stubs with `vi.fn()` methods that can be configured per test.

### Hono Request Helpers

For API route tests:

```ts
import { createTestApp, jsonRequest, getRequest, postRequest } from '../../config/vitest/hono/create-test-client.js';

const app = createTestApp();
// Register routes on app...
const res = await app.request(postRequest('/api/sessions', { settingId: 'test' }));
```

## Mocking Guidelines

- Mock at package boundaries, not internal functions
- Use shared mock factories from `config/vitest/mocks/` for cross-package seams
- Use `vi.mock()` for module-level mocking when testing internal wiring
- Prefer dependency injection over module mocking when the design supports it
- Do not mock the module under test

## Test Style

- Use `describe` blocks to group related tests
- Use clear test names that describe behavior: `it('rejects invalid session ID')` not `it('test1')`
- Keep tests focused: one assertion concept per test
- Prefer `expect().toEqual()` for deep comparison and `expect().toBe()` for identity
- Use `beforeEach` for shared setup; avoid `beforeAll` unless setup is expensive and safe to share
- Clean up side effects in `afterEach`

## Running Tests

```bash
# Single package
pnpm --dir packages/schemas run test

# All packages (via turbo)
turbo run test

# With coverage (opt-in)
pnpm --dir packages/schemas run test -- --coverage

# Repo-wide with workspace
npx vitest run --workspace
```

## Coverage

Coverage uses `@vitest/coverage-v8` in reporting-only mode. Coverage is not enforced in CI yet. To generate a coverage report:

```bash
pnpm --dir packages/<name> run test -- --coverage
```

Reports are generated in `<package>/coverage/` as text, JSON, and HTML.

## Package Test Priority

Packages are tested in dependency order:

| Tier | Packages | Rationale |
|------|----------|-----------|
| 1 | schemas, bus, utils | Zero or minimal internal deps; foundational |
| 2 | services, projections, generator | Depend on Tier 1 |
| 3 | actors, db, workers | Infrastructure and runtime dependencies |
| 4 | api, llm, ui, web | Highest-level consumers |

### Deferred packages

- **characters**: Zero active consumers in the monorepo
- **retrieval**: Experimental; not consumed by any active code path

These packages are excluded from test coverage targets until they have active consumers.

## Workspace Configuration

A `vitest.workspace.ts` exists at the repo root for repo-wide test execution and coverage aggregation. Package-local `vitest run` remains the primary workflow. The workspace file is opt-in for broader reporting.

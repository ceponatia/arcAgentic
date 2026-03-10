# Dependency Audit Report

Generated: 2026-03-10
Workspace root: /home/brian/projects/arcAgentic

## Summary Dashboard

| Check | Status | Notes |
| --- | --- | --- |
| Workspace importers | Pass | All current manifests have matching importers in `pnpm-lock.yaml`; `apps/web` is present and `packages/web` is absent. |
| Lockfile/workspace dependency state | Pass with repair items | No lockfile drift was found from the `packages/web` to `apps/web` relocation itself. Additional dependency-state issues below still need repair. |
| Package manager metadata | Pass | Root `packageManager` is pinned to `pnpm@10.28.2`; `apps/web` has no stale package manager metadata. |
| Stale relocation references | Warning | Generated `.eslintcache` still contains historical `packages/web` paths from the previous repo path (`arcWindsurf`). |
| Unused dependency audit | Warning | `depcheck` reports many root false positives because script-only tooling is not statically imported. One concrete app-level issue was found: `apps/web` imports `zod` without declaring it. |
| Vulnerability audit | Fail | `pnpm audit --json` reports high and moderate issues in `packages/api` and root dev-tooling transitive dependencies. |
| License / supply-chain scan | Pass | `pnpm licenses list --json` did not surface non-standard or obviously restrictive licenses in the current dependency graph. Existing `patchedDependencies`/`overrides` are internally consistent. |

## Issues

| issue_id | package | severity | description |
| --- | --- | --- | --- |
| STALE-eslintcache-web-paths | workspace metadata | low | `.eslintcache` still records old `packages/web` file paths under `/home/brian/projects/arcWindsurf/...`. This is stale generated metadata after the move and should be regenerated or removed. |
| MISSING-apps-web-zod | @minimal-rpg/web | medium | `apps/web/src/features/session-workspace/SessionWorkspace.tsx` imports `zod`, but `apps/web/package.json` does not declare it. The app currently relies on hoisting from the workspace root. |
| VULN-api-hono-stack | @minimal-rpg/api | high | `pnpm audit` reports vulnerable `hono` and `@hono/node-server` versions in `packages/api`. Recommended targets include `hono >= 4.12.4` and `@hono/node-server >= 1.19.10`. |
| VULN-root-toolchain-transitives | root toolchain | high | `pnpm audit` reports transitive vulnerabilities in `minimatch`, `rollup`, `markdown-it`, `lodash`, and `ajv` through root tooling such as `glob`, `tsup`, `markdownlint-cli`, `secretlint`, and the lint stack. |

## Notes

- The relocation itself appears structurally correct: the workspace globs include `apps/*`, the lockfile importer is `apps/web`, and no `packages/web` importer remains in `pnpm-lock.yaml`.
- The stale `packages/web` references found during this audit were limited to generated cache metadata, not tracked workspace manifests or TypeScript project references.
- `depcheck` also flagged some potentially unused `apps/web` dependencies (`@minimal-rpg/db`, `@minimal-rpg/generator`, `rehype-autolink-headings`), but those were not included as repair issues because this audit did not confirm them as relocation-induced or definitively unused.

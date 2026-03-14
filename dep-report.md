# Dependency Audit Report

## Summary dashboard

| Metric | Value |
| --- | --- |
| Workspace manifests scanned | 16 package.json files |
| Remaining `test` scripts in manifests | 0 |
| Remaining direct `vitest` / `@vitest/*` manifest deps | 0 |
| Remaining `vitest` / `@vitest/*` lockfile entries | 0 |
| Residual `vitest.config.ts` files | 15 package-local config files |
| Packages where depcheck reports missing `vitest` | 15 |
| Cleanup-related unused test deps | 4 entries across 2 manifests |
| Security advisories from `pnpm audit` | 1 high |
| Dependency version conflict families | 13 |
| License inventory status | Blocked by pnpm package-index error |

## Notes

- The Vitest dependency cleanup in manifests and `pnpm-lock.yaml` is complete: no `test` scripts remain and no direct `vitest` or `@vitest/*` entries were found in any manifest or in the lockfile.
- The main cleanup residue is config-level: every workspace package except the root still has a `vitest.config.ts`, which causes `pnpm dlx depcheck --json` to report missing `vitest` even though the manifests were intentionally cleaned.
- `pnpm licenses list --json` and `pnpm list -r --depth -1 vitest @vitest/coverage-v8` could not complete cleanly after the lockfile-only refresh, so license metadata and some install-state checks remain partially blocked until a full install refresh is performed.

## Issues

| issue_id | package | severity | description |
| --- | --- | --- | --- |
| CLEANUP-vitest-config-residue | workspace packages | high | `apps/web` plus all 14 packages under `packages/*` still contain `vitest.config.ts`. `depcheck` therefore reports missing `vitest` in each package even though Vitest was removed from manifests and lockfile. |
| CLEANUP-testing-library-residue | apps/web, packages/ui | medium | `@testing-library/jest-dom` and `@testing-library/react` remain declared as devDependencies in both manifests and are reported unused by `depcheck`, indicating leftover test-only package state after the Vitest cleanup. |
| CLEANUP-ui-css-tooling-residue | packages/ui | low | `autoprefixer` is reported unused in `packages/ui`, and no package-local PostCSS config was found there. This looks like leftover build/test-era tooling rather than an active dependency. |
| MANIFEST-eslint-config-prettier-missing | workspace root | medium | Root `eslint.config.mjs` imports `eslint-config-prettier`, but the root manifest does not declare it. This is a manifest inconsistency independent of Vitest, but it affects lint reproducibility. |
| SECURITY-flatted-dos-transitive | workspace root dependency graph | high | `pnpm audit --json` reports `flatted` `<3.4.0` via `eslint > file-entry-cache > flat-cache > flatted`, with advisory `GHSA-25h7-pfq9-p65f` / `CVE-2026-32141`. Suggested target is `flatted@3.4.1`. |
| CONSISTENCY-pnpm-install-metadata-blocked | workspace install state | medium | `pnpm licenses list --json` failed with `ERR_PNPM_MISSING_PACKAGE_INDEX_FILE`, and `pnpm list` failed with `Cannot read properties of undefined (reading 'resolution')`. After the lockfile-only refresh, local install metadata is not fully trustworthy for secondary tooling. |
| ALIGNMENT-version-family-drift | workspace manifests | low | 13 dependency families still use multiple version ranges across manifests, including `typescript`, `zod`, `@types/node`, `react`, `react-dom`, `pg`, and `tsup`. This does not appear to be introduced by the Vitest cleanup, but it remains workspace hygiene debt. |

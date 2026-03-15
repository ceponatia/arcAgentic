# Dependency Audit Report

## Scope

Read-only dependency audit for /home/brian/projects/arcAgentic after the tsup cleanup:

- removed `tsup` from the root manifest
- removed `tsup` from `packages/generator`, `packages/ui`, and `packages/utils`
- switched generator and ui builds to `tsc -b`
- removed dead `tsup` config files

## Summary dashboard

| Metric | Value |
| --- | --- |
| Workspace manifests scanned | 16 `package.json` files + `pnpm-workspace.yaml` + `pnpm-lock.yaml` |
| `tsup` declarations remaining in scanned manifests | 0 |
| `tsup.config.*` files found | 0 |
| Manifest version-conflict families | 12 |
| Confirmed missing direct manifest declarations | 5 |
| `pnpm audit --json` advisories | 1 high |
| License inventory status | Blocked by local pnpm store metadata error |

## Notes

- The tsup dependency-state cleanup appears complete from the manifest/config side: no remaining `tsup` declaration was found in scanned workspace manifests, and no `tsup.config.*` files were found.
- `packages/generator`, `packages/ui`, and `packages/utils` now use `tsc -b` build scripts.
- Per-package `depcheck` output contained some monorepo noise from shared tooling and checked-in `dist` output, but the issues listed below were verified against current manifests and source imports.
- `pnpm licenses list --json` could not complete because the local pnpm store is missing package index metadata for `@commitlint/cli`, so license review is only partially complete until install metadata is refreshed.

## Issues

| issue_id | package | severity | description |
| --- | --- | --- | --- |
| SECURITY-flatted-dos-transitive | workspace dependency graph | high | `pnpm audit --json` reports `flatted@3.3.3` via `.>eslint>file-entry-cache>flat-cache>flatted` with advisory `GHSA-25h7-pfq9-p65f` / `CVE-2026-32141`. The suggested remediation target is `flatted@3.4.1`. |
| MANIFEST-eslint-config-prettier-missing | workspace root | medium | Root `eslint.config.mjs` imports `eslint-config-prettier`, but the root manifest does not declare it. |
| MANIFEST-characters-zod-missing | `@arcagentic/characters` | medium | `packages/characters/src/hygiene/modifiersProvider.ts` imports `zod`, but `packages/characters/package.json` does not declare `zod`. |
| MANIFEST-db-dotenv-missing | `@arcagentic/db` | medium | `packages/db/src/migrations/migrate.ts` imports `dotenv`, but `packages/db/package.json` does not declare `dotenv`. |
| MANIFEST-db-zod-missing | `@arcagentic/db` | medium | `packages/db/src/repositories/world.ts` uses `zod`, but `packages/db/package.json` does not declare `zod`. |
| MANIFEST-utils-zod-missing | `@arcagentic/utils` | medium | `packages/utils/src/shared/json.ts` and `packages/utils/src/forms/form-errors.ts` use `zod`, but `packages/utils/package.json` does not declare `zod`. |
| SUPPLYCHAIN-license-inventory-blocked | local install metadata | medium | `pnpm licenses list --json` fails with `ERR_PNPM_MISSING_PACKAGE_INDEX_FILE` for `@commitlint/cli@20.2.0`, so license inventory and follow-on supply-chain review are currently blocked until the local pnpm metadata is repaired. |
| ALIGNMENT-version-family-drift | workspace manifests | low | 12 dependency families still use multiple version ranges across manifests, including `typescript`, `@types/node`, `@types/pg`, `react`, `react-dom`, `tailwindcss`, `pg`, `tsx`, and `zod`. This is hygiene debt rather than a regression unique to the tsup cleanup. |

## Version conflict families

- `@types/node`: `^22.10.1`, `^24.10.1`
- `@types/pg`: `^8.11.10`, `^8.16.0`
- `@types/react`: `^19.0.0`, `^19.2.5`
- `@types/react-dom`: `^19.0.0`, `^19.2.3`
- `fast-json-patch`: `3.1.1`, `^3.1.1`
- `pg`: `^8.13.1`, `^8.16.3`
- `react`: `^19.0.0`, `^19.2.0`
- `react-dom`: `^19.0.0`, `^19.2.0`
- `tailwindcss`: `^3.0.0`, `^3.4.14`
- `tsx`: `^4.19.1`, `^4.20.6`
- `typescript`: `^5.4.0`, `^5.6.3`, `^5.9.3`
- `zod`: `^3.23.8`, `^4.1.12`

## Commands run

- `pnpm dlx depcheck --json`
- per-package `pnpm dlx depcheck <path> --json`
- `pnpm audit --json`
- `pnpm licenses list --json`

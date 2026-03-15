# Dependency Audit Report

## Scope

Current working tree audit for /home/brian/projects/arcAgentic after adding `eslint-plugin-react-hooks` as a root devDependency for PH02 React rules.

## Summary dashboard

| Metric | Value |
| --- | --- |
| Workspace manifests scanned | 16 `package.json` files + `pnpm-workspace.yaml` + `pnpm-lock.yaml` |
| New dependency declaration | Root `devDependencies` includes `eslint-plugin-react-hooks@^7.0.1` |
| New dependency lockfile resolution | 1 resolved instance: `eslint-plugin-react-hooks@7.0.1(eslint@9.39.1)` |
| New dependency usage | Imported and registered in `eslint.config.mjs`; `depcheck` reports it under `using` |
| Root depcheck missing deps | 1 (`eslint-config-prettier`) |
| Root depcheck unused direct deps | 14 total (4 dependencies, 10 devDependencies); `eslint-plugin-react-hooks` is not among them |
| Security advisories from `pnpm audit --json` | 1 high |
| Dependency version conflict families | 13 |
| License inventory status | Blocked by pnpm package-index error |

## Notes

- The newly added `eslint-plugin-react-hooks` dependency is in a healthy state by itself: it is declared once at the root, resolved in the lockfile, and used by the root ESLint config.
- No duplicate `eslint-plugin-react-hooks` versions were found in workspace manifests or the lockfile excerpt inspected during this audit.
- `pnpm dlx depcheck --json` confirms the plugin is used and instead reports a separate missing dependency: `eslint-config-prettier` imported by the root ESLint config but absent from the root manifest.
- `pnpm audit --json` reports one high-severity advisory unrelated to the new plugin: `flatted` `<3.4.0` via `eslint > file-entry-cache > flat-cache > flatted`.
- `pnpm licenses list --json` could not complete because local pnpm store metadata is incomplete (`ERR_PNPM_MISSING_PACKAGE_INDEX_FILE`), so license and supply-chain review is partially blocked until install metadata is refreshed.

## Issues

| issue_id | package | severity | description |
| --- | --- | --- | --- |
| MANIFEST-eslint-config-prettier-missing | workspace root | medium | Root `eslint.config.mjs` imports `eslint-config-prettier`, but the root manifest does not declare it. This is the only root missing dependency reported by fresh `depcheck`, and it is independent of the new React Hooks plugin. |
| SECURITY-flatted-dos-transitive | workspace root dependency graph | high | `pnpm audit --json` reports `flatted` `3.3.3` at `.>eslint>file-entry-cache>flat-cache>flatted` with advisory `GHSA-25h7-pfq9-p65f` / `CVE-2026-32141`. Recommended target is `flatted@3.4.1`. |
| SUPPLYCHAIN-license-inventory-blocked | workspace install metadata | medium | `pnpm licenses list --json` fails with `ERR_PNPM_MISSING_PACKAGE_INDEX_FILE` for `@commitlint/cli`, so license inventory and secondary supply-chain checks cannot currently be completed from the local install state. |
| HYGIENE-root-unused-manifest-deps | workspace root | medium | Fresh root `depcheck` flags 14 direct root entries as unused from the root package context: dependencies `drizzle-orm`, `fast-json-patch`, `pg`, `zod`; devDependencies `@commitlint/cli`, `@commitlint/config-conventional`, `@types/node`, `@types/pg`, `add`, `dotenv`, `drizzle-kit`, `rimraf`, `sucrase`, `tsx`. This does not include `eslint-plugin-react-hooks`. |
| ALIGNMENT-version-family-drift | workspace manifests | low | 13 dependency families still use multiple version ranges across manifests, including `typescript`, `@types/node`, `zod`, `react`, `react-dom`, `pg`, `tsup`, `tsx`, and others. This is workspace hygiene debt, not a new issue introduced by the React Hooks plugin. |

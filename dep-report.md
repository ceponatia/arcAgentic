# Dependency Audit Report

Generated: 2026-03-10
Workspace root: /home/brian/projects/arcAgentic

## Summary Dashboard

| Check | Status | Notes |
| --- | --- | --- |
| Workspace manifests | Pass | 16 workspace package manifests found and covered by pnpm workspace settings. |
| Vulnerability audit | Pass | `pnpm audit --json` reported 0 known vulnerabilities. |
| License / supply-chain scan | Pass | No missing package licenses for published packages and no direct `git:`, `github:`, `file:`, `link:`, or URL-based dependency specs were found. Internal `workspace:*` references are expected. |
| Version alignment | Warning | Several direct dependency families are pinned to materially different versions across packages. |
| Unused dependency audit | Warning | `depcheck` reported concrete unused declarations in `apps/web`; root-level results were mostly script/config false positives and were not treated as issues. |

## Issues

| issue_id | package | severity | description |
| --- | --- | --- | --- |
| CONFLICT-zod-major | workspace | high | Direct `zod` declarations are split across `^4.1.12` and `^3.23.8` (`packages/bus`, `packages/llm`, `packages/projections`, `packages/services`, `packages/workers`). This is a real major-version divergence in a shared schema/runtime library. |
| CONFLICT-typescript-stack | workspace | medium | Direct TypeScript toolchain versions are split across `typescript ^5.9.3`, `^5.6.3`, and `^5.4.0`, plus `@types/node ^24.10.1` vs `^22.10.1`. This can produce inconsistent type-checking and editor results across packages. |
| CONFLICT-vitest-stack | workspace | medium | Test tooling is not aligned: `vitest ^4.0.18` vs `^4.0.16` and `@vitest/coverage-v8 4.0.18` vs `^4.0.16`. |
| CONFLICT-build-runtime-tooling | workspace | low | Supporting tooling is split across multiple versions: `tsup ^8.5.1` vs `^8.0.0`, `tsx ^4.20.6` vs `^4.19.1`, `pg ^8.16.3` vs `^8.13.1`, and `@types/pg ^8.16.0` vs `^8.11.10`. |
| UNUSED-apps-web-db | @minimal-rpg/web | low | `apps/web/package.json` declares `@minimal-rpg/db`, but a workspace-wide source search found no imports or requires of that package under `apps/web`. |
| UNUSED-apps-web-generator | @minimal-rpg/web | low | `apps/web/package.json` declares `@minimal-rpg/generator`, but a workspace-wide source search found no imports or requires of that package under `apps/web`. |
| UNUSED-apps-web-rehype-autolink-headings | @minimal-rpg/web | low | `apps/web/package.json` declares `rehype-autolink-headings`, but the package appears only in a comment in `apps/web/vite.config.ts` and has no runtime/config import usage. |

## Notes

- `apps/web` still correctly declares `zod`; the stale missing-`zod` finding from the prior report does not apply to the current workspace state.
- `autoprefixer` is used by `apps/web/postcss.config.cjs`, so it was not treated as unused.
- The root-level `depcheck` run reported many false positives because repository scripts and JSONC config files are not fully understood by `depcheck`; those were excluded from the issue table.

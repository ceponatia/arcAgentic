# Dependency Audit Report

## Scope

Read-only dependency audit for `/home/brian/projects/arcAgentic` after the PH02 Zod alignment changes.

- enumerated all workspace manifests and lock metadata
- reviewed the current manifest/lockfile diff with emphasis on `zod`
- ran `CI=true pnpm audit --json`
- ran targeted `pnpm dlx depcheck` checks across the PH02-touched packages
- checked workspace-internal dependency declarations for `workspace:*` consistency
- filtered license inventory output for strong-copyleft or restricted license markers

## Summary dashboard

| Metric | Value |
| --- | --- |
| Workspace manifests scanned | 16 `package.json` files + `pnpm-workspace.yaml` + `pnpm-lock.yaml` |
| PH02 direct `zod` manifest changes confirmed | root + `packages/bus`, `packages/llm`, `packages/projections`, `packages/services`, `packages/workers` |
| New `zod` version conflicts introduced by PH02 | 0 |
| Missing workspace manifests introduced by PH02 | 0 |
| Internal workspace dependency protocol regressions | 0 |
| `pnpm audit --json` advisories | 0 |
| Strong-copyleft / restricted license markers found | 0 |
| Confirmed PH02-introduced dependency issues | 0 |
| Other dependency issues still present in current workspace state | 1 |

## Issues

| issue_id | package | severity | description |
| --- | --- | --- | --- |
| MANIFEST-api-missing-zod | @arcagentic/api | medium | @arcagentic/api imports `zod` directly in route and validation files, but [packages/api/package.json](/home/brian/projects/arcAgentic/packages/api/package.json) does not declare `zod`. This is present in the current workspace state, but it does not appear to be introduced by the PH02 Zod-alignment diff. Follow-up dep-repair is optional for PH02 and should be tracked separately. |

## Notes

- PH02 successfully normalized the lockfile away from `zod@3.25.76`; the notable resolver changes observed were `@anthropic-ai/sdk` and `openai` moving to `zod@4.1.12` in the lockfile.
- The packages touched directly by PH02 all use a consistent direct `zod` range of `^4.1.12`; no mixed direct `zod` ranges remain in workspace manifests.
- `depcheck` still reports baseline noise such as missing `vitest` in packages with test files and older root-level unused devDependencies. Those findings are not attributable to PH02.
- The current audit did not find a PH02-created security, licensing, or manifest-consistency regression.

## Commands run

- `git --no-pager diff --name-only -- package.json 'packages/*/package.json' 'apps/*/package.json' pnpm-lock.yaml`
- workspace manifest scan via Node script
- workspace internal-dependency protocol scan via Node script
- `CI=true pnpm audit --json`
- targeted `CI=true pnpm dlx depcheck <dir> --json` sweep across root and PH02-touched packages
- targeted `rg -n 'zod' packages/api packages/{bus,llm,projections,services,workers}`
- `CI=true pnpm licenses list --json | rg 'AGPL|GPL|LGPL|SSPL|BUSL|Elastic-2.0|Commons-Clause|CC-BY-NC'`

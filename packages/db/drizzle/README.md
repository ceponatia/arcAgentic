# Drizzle Bridge Artifacts

This directory is for generated Drizzle Kit migration candidates.

Workflow:

1. Update `packages/db/src/schema/`.
2. Run `pnpm --dir packages/db run db:generate`.
3. Review the generated SQL here.
4. Copy the final, reviewed statements into the next ordered migration under `packages/db/sql/`.
5. Apply the committed SQL chain with `CI=true pnpm --dir packages/db run db:migrate`.

Files in this directory are bridge artifacts. They are useful for diff review, but they are not the applied migration source of truth while the legacy SQL runner remains active.

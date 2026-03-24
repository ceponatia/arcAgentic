# @arcagentic/db

PostgreSQL data access layer for arcAgentic. This package owns Drizzle schema definitions, typed repository functions, SQL migrations, seeds, connection setup, and pgvector registration.

## Query Policy

- Use Drizzle tables and the query builder for repository code by default.
- Use typed `sql` helpers only when the query shape is still a clean fit for Drizzle.
- Keep raw SQL localized to explicit exceptions that are hard to express or review in Drizzle.

Current raw SQL exceptions:

- `src/repositories/admin.ts`: admin-only schema introspection and sampled table reads over `information_schema` and a validated allowlist of table names.
- `src/repositories/studio-sessions.ts`: startup compatibility check that verifies the `studio_sessions` table exists and points operators to the migration command if it does not.
- `src/migrations/migrate.ts`: legacy SQL migration runner, extension bootstrap, and `_migrations` tracking table.
- `src/seeds/test-entities.ts`: compatibility seed for older test/demo data paths that still target legacy tables.
- `src/clear-db.ts`: destructive maintenance script that resets the schema.

If a new raw SQL site is introduced, document why Drizzle was not the right tool and keep the SQL scoped to a single helper.

## Migration Workflow

The package currently uses a bridge workflow:

1. Update the authoritative Drizzle table definitions in `src/schema/`.
2. Generate a candidate diff with `pnpm --dir packages/db run db:generate`.
3. Review the generated SQL under `packages/db/drizzle/`.
4. Port the final, hand-reviewed SQL into the next ordered migration under `packages/db/sql/`.
5. Run `CI=true pnpm --dir packages/db run db:migrate` to apply the legacy bridge migration chain.

Why the extra step: production and local databases are still applied through `src/migrations/migrate.ts`, which reads ordered `.sql` files from `packages/db/sql/`. Drizzle Kit is used as a diff assistant, not as the applied migration source of truth.

## Package Scripts

- `pnpm --dir packages/db run db:generate`: generate candidate Drizzle migrations into `packages/db/drizzle/`
- `pnpm --dir packages/db run db:migrate`: apply the committed SQL migration chain
- `pnpm --dir packages/db run db:seed`: seed built-in tags
- `pnpm --dir packages/db run db:seed:test-entities`: seed compatibility test entities

## Validation

- `CI=true pnpm --dir packages/db run lint`
- `CI=true pnpm --dir packages/db run typecheck`
- `CI=true pnpm --dir packages/db run build`

## Notes

- Runtime DDL in repository code is not allowed. If a table is missing, fix the migration chain instead of creating the table at startup.
- When mapping nullable database fields to domain models, use `nullableOptional` from `@arcagentic/schemas` where applicable.

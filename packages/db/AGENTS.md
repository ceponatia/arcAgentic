# @arcagentic/db

## Purpose

PostgreSQL data access layer. Provides typed queries, migrations, and connection pooling for all persistent game data.

## Scope

- PostgreSQL connectivity and pooling
- SQL migrations, schema files, and seed scripts
- Data access methods for sessions, messages, profiles, instances, and tags
- Database introspection and pgvector type registration

## Best Practices

- **Handling Nulls**: When mapping database results to domain objects, use the `nullableOptional` helper from `@arcagentic/schemas` (via `Utils.nullableOptional`). This ensures that SQL `NULL` values are correctly transformed to TypeScript `undefined`, maintaining consistency with Zod schemas.
- **Drizzle First**: Repository code should use Drizzle tables, query builder APIs, or typed `sql` helpers by default. Raw SQL is reserved for migration bootstrapping, admin introspection over `information_schema`, and other documented edge cases where Drizzle is not a good fit.
- **Migration Bridge**: `src/schema/` is the working schema model, `drizzle-kit` generates candidate diffs into `packages/db/drizzle/`, and the committed migration source of truth remains the ordered SQL chain in `packages/db/sql/` until the bridge is retired.
- **Runtime DDL**: Do not create or alter tables inside repository code. Startup compatibility helpers may verify that required tables exist, but schema creation belongs in migrations.

## Package Connections

- **api**: API calls db methods to load/persist data
- **retrieval**: Retrieval queries db for knowledge nodes (future: pgvector search)
- **web**: Web client uses db indirectly through API

This package has no internal workspace dependencies. It is a foundational layer.

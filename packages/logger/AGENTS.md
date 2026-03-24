# @arcagentic/logger

## Purpose

Shared structured logging factory for backend packages. Provides pino-based loggers with package-scoped context, environment-controlled log levels, and consistent field conventions.

## Scope

- Base pino logger configuration and environment-driven log level control
- Package-scoped child logger factory
- Logger type re-exports for consumer convenience

## Non-Goals

- Frontend/browser logging
- Log aggregation, shipping, or storage
- Application-specific log messages (those belong in consumer packages)

## Package Connections

- **api**, **bus**, **services**, **actors**, **workers**, **db**: All backend packages import from this package to create structured loggers

This package has no internal workspace dependencies. It is a foundational logging layer.

## Validation

- `CI=true pnpm --dir packages/logger run lint`
- `CI=true pnpm --dir packages/logger run typecheck`
- `CI=true pnpm --dir packages/logger run build`

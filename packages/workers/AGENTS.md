# @arcagentic/workers

## Purpose

BullMQ-based background worker processes for production deployments. Provides Redis-backed job queues, processors, and scheduling with horizontal scaling support.

## Scope

- BullMQ queue definitions and Redis connection management
- Job processors: cognition (LLM-backed NPC decisions), tick (world simulation ticks), embedding
- Per-session tick scheduling via the BullMQ `Scheduler`
- Heartbeat monitoring to pause/resume session ticks based on client presence
- Presence hydration from persisted session heartbeats on startup

## Tick Scheduling: Workers vs Services

Both `@arcagentic/services` and this package provide tick scheduling, targeting different deployment models:

| Concern               | `@arcagentic/services`                                                                          | `@arcagentic/workers`                                               |
| --------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Tick source**       | `TickEmitter` — in-process `setInterval` emitting `TICK` events to `worldBus`                   | `Scheduler` — BullMQ repeatable jobs per session                    |
| **Schedule resolver** | `Scheduler` — subscribes to `TICK` on `worldBus`, resolves NPC schedules across active sessions | Tick processor — processes BullMQ tick jobs and emits to `worldBus` |
| **Deployment model**  | Single-instance / development                                                                   | Production with Redis-backed persistence and horizontal scaling     |
| **Persistence**       | None; ticks stop when the process stops                                                         | Redis-backed repeatable jobs survive restarts                       |

The `HeartbeatMonitor` in this package periodically checks session liveness via the presence service and stops tick jobs for stale sessions.

## Package Connections

- **bus**: Tick processor emits events to `worldBus`
- **services**: Uses `presenceService` for session liveness; scheduler implements the `PresenceSchedulerStopOnly` contract
- **actors**: Cognition processor delegates to actor/NPC logic
- **llm**: Cognition processor uses `TieredCognitionRouter` and `OpenAIProvider`
- **db**: Hydrates presence state from persisted session heartbeats
- **schemas**: Shared types for tasks, events, and presence contracts

## Validation

- `CI=true pnpm --dir packages/workers run lint`
- `CI=true pnpm --dir packages/workers run typecheck`
- `CI=true pnpm --dir packages/workers run build`
- `CI=true pnpm --dir packages/workers run test`

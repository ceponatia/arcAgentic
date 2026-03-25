# @arcagentic/services

## Purpose

System services that implement world mechanics (physics, time, social, location, rules). Services consume intents from the World Bus and emit effects, state changes, and sensory events back onto the bus.

## Scope

- Physics and movement resolution (spatial queries, pathfinding, proximity)
- Time progression (tick emission, scheduling)
- Social simulation (dialogue, factions, relationship effects)
- Location graph operations (exit resolution, reachability)
- Rules validation and simulation hooks
- WorldBus wiring: subscribe to intent events, emit effect/state events

This package should remain focused on mechanics and service orchestration. Avoid HTTP concerns (handled by `@arcagentic/api`) and avoid owning long-term persistence models (handled by `@arcagentic/db`, with services calling into repositories when needed).

## Package Connections

- **bus**: Primary dependency; services subscribe/emit via WorldBus
- **schemas**: Shared Zod schemas and domain types for inputs/outputs
- **db**: Persistence for event logs, snapshots, and state when required
- **actors**: Producers/consumers of intents and effects

## Time Subsystem

The `src/time/` directory contains the in-process tick and scheduling system:

- **TickEmitter** (`tick-emitter.ts`) — emits `TICK` events to the WorldBus on a configurable timer interval. Used as the tick source for single-instance and development deployments. The server starts it via `tickEmitter.start(5000)`.
- **Scheduler** (`scheduler.ts`) — subscribes to `TICK` events on the WorldBus and processes NPC schedules for all active sessions. Emits `MOVE_INTENT` and `NPC_ACTIVITY_CHANGED` events when NPC locations or activities change.
- **schedule-service.ts** — pure functions for resolving NPC schedules at a given game time. Used by the Scheduler but also available independently.
- **types.ts** — shared type definitions for schedule resolution.

For production multi-instance deployments, the BullMQ-based Scheduler in `@arcagentic/workers` replaces `TickEmitter` as the tick source, providing per-session Redis-backed scheduling with horizontal scaling. The services `Scheduler` still processes the resulting tick events regardless of source.

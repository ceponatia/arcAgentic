# @arcagentic/actors

## Purpose

Implements the package-level actor surfaces for arcAgentic. Today that includes the WorldBus-driven NPC runtime, a minimal player actor stub, session-scoped actor registry management, and an LLM-backed studio NPC workflow for character authoring.

## Scope

- Base actor contracts and lifecycle wiring in `src/base/`
- NPC runtime pieces in `src/npc/`: perception, cognition prompts/logic, XState machine, and `NpcActor`
- Player actor implementation in `src/player/`: runtime state tracking, event handling, and lifecycle integration
- Session-scoped registry management in `src/registry/`
- Studio NPC authoring helpers in `src/studio-npc/`, including its XState machine, conversation manager, inference/discovery helpers, prompt builders, and response validation

## Non-Goals

- World mechanics, proximity, location, physics, and other simulation services
- HTTP routes, persistence, or UI concerns
- Canonical schema ownership; shared types and validation stay in `@arcagentic/schemas`
- Deep coupling to sibling package internals

## Current Public Surface

- Package root re-exports `base`, `npc`, `player`, `registry`, and `studio-npc`
- `src/base/` exports shared actor types plus `BaseActorLifecycle`
- `src/npc/` exports `PerceptionLayer`, `CognitionLayer`, `createNpcMachine`, `NpcActor`, `EventPromoter`, `DEFAULT_PERCEPTION_CONFIG`, `DEFAULT_PROMOTION_RULES`, and NPC runtime/perception config types
- `src/player/` exports `PlayerActor`, `PlayerRuntimeState`, and `PlayerDialogueEntry`
- `src/registry/` exports `ActorRegistry` and the global `actorRegistry`
- `src/studio-npc/` exports `StudioNpcActor`, `createStudioNpcActor`, `createStudioMachine`, conversation utilities, prompt builders, advanced generators/analyzers, and validation helpers

## Current Runtime Reality

- NPC runtime is event-driven and wired directly to `worldBus` for subscription and intent emission
- NPC machine handles a narrow loop: `idle -> perceiving -> thinking -> acting -> waiting`
- NPC event promotion is configurable via `PerceptionConfig` and `EventPromotionRule`; the default config promotes `SPOKE`, `DAMAGED`, and `DIED` at high priority, `MOVED`, `ITEM_ACQUIRED`, `ITEM_DROPPED`, and `NPC_ACTIVITY_CHANGED` at medium priority, and `TICK`, `ACTOR_SPAWN`, and `ACTOR_DESPAWN` at low priority with cooldowns
- `CognitionLayer` supports both simple rule-based decisions and optional LLM-backed decisions when `profile` and `llmProvider` are provided
- `PlayerActor` is event-driven: it handles `MOVED`, `SPOKE`, `ITEM_ACQUIRED`, `ITEM_DROPPED`, `TICK`, `ACTOR_SPAWN`, and `ACTOR_DESPAWN` events, maintains location, inventory, dialogue history, and game-time awareness, and integrates with the actor lifecycle via `BaseActorLifecycle`
- The registry is the main lifecycle entrypoint for runtime actors and emits `ACTOR_SPAWN` / `ACTOR_DESPAWN` events
- Studio NPC code is a separate LLM-backed authoring workflow, not part of the WorldBus NPC runtime

## Package Connections

- `@arcagentic/bus`: direct runtime dependency for subscribing actors and emitting intents/lifecycle events
- `@arcagentic/schemas`: shared actor, event, studio-response, and validation types
- `@arcagentic/llm`: optional NPC cognition and required studio-NPC LLM workflows
- Downstream consumers in the repo currently include `@arcagentic/api` for turn orchestration, game turns, and studio routes

## Working Rules

- Keep actors event-driven and package-local; do not pull HTTP, DB, or UI behavior into this package
- Prefer edits within one actor surface at a time: `base`, `npc`, `player`, `registry`, or `studio-npc`
- Treat `studio-npc` as an existing public surface that must be maintained carefully, but do not expand it opportunistically
- If a change affects package-root exports or actor/event contracts, call it out as a contract change for downstream packages
- Use sibling packages only through their package-root public APIs

## Validation

- `CI=true pnpm --dir packages/actors run lint`
- `CI=true pnpm --dir packages/actors run typecheck`
- `CI=true pnpm --dir packages/actors run build`
- There is currently no `test` script in `packages/actors/package.json`, and the package does not have an active in-package test surface to run

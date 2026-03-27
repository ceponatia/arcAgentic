# @arcagentic/narrator

## Purpose

Narrative composition layer for arcAgentic. Receives structured NPC intents (dialogue, actions, emotions) from parallel actor cognition and composes them into cohesive prose passages for the player. Acts as a post-processing transform after NPC decisions, not as an event-driven actor.

## Scope

- Narrator prompt construction and prose composition via LLM
- Structured NPC intent aggregation into unified narrative output
- Narrative voice, tone, and style configuration
- Scene context assembly for narrator prompts (location, present actors, recent history)
- Format guidance for mixed dialogue and action narration

## Non-Goals

- NPC decision-making or cognition (belongs in `@arcagentic/actors`)
- World mechanics, physics, or simulation (belongs in `@arcagentic/services`)
- HTTP routing or request handling (belongs in `@arcagentic/api`)
- Canonical schema ownership (shared types stay in `@arcagentic/schemas`)
- LLM provider adapters or infrastructure (belongs in `@arcagentic/llm`)
- Event bus participation or event-driven lifecycle

## Package Connections

- **@arcagentic/schemas**: Shared event, character, and session types
- **@arcagentic/llm**: LLM provider for prose generation calls
- **@arcagentic/api**: Consumes narrator in turn orchestration after collecting NPC intents

## Public API

- Types from `src/types.ts`: `NpcIntent`, `NarratorContext`, `NarrationResult`, `NarrationConfig`
- Narrator service from `src/narrator.ts`: `composeNarration()`

## Validation

- `CI=true pnpm --dir packages/narrator run lint`
- `CI=true pnpm --dir packages/narrator run typecheck`
- `CI=true pnpm --dir packages/narrator run build`

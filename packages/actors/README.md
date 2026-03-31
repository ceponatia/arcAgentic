# @arcagentic/actors

Package-level actor surfaces for arcAgentic, including the WorldBus-driven NPC runtime, a minimal player actor stub, session-scoped registry management, and the studio NPC authoring workflow.

## Overview

This package implements the actor model for the World Bus architecture. Actors are autonomous entities that:

1. **Perceive** - Filter and process events from the WorldBus
2. **Think** - Decide on actions based on perception
3. **Act** - Emit intents back to the WorldBus

## Actor Types

### NPC Actors

- Event-driven runtime actors with a perception/cognition/action loop
- React to selected world events autonomously
- Emit intents based on simple rules, with optional LLM-backed cognition when profile and provider data are available
- LLM-backed cognition can optionally receive episodic memories through an injected memory provider seam

### Player Actors

- Lightweight observers/stubs in the current package state
- Not yet a full multiplayer player runtime

### Studio NPC Workflow

- Separate LLM-backed authoring flow for generating and refining NPC content
- Not part of the live WorldBus NPC runtime loop

## Usage

```typescript
import { actorRegistry } from "@arcagentic/actors";

// Spawn an NPC actor
const barkeep = actorRegistry.spawn({
  id: "barkeep-1",
  type: "npc",
  npcId: "barkeep",
  sessionId: "session-123",
  locationId: "tavern",
});

// Actor automatically subscribes to WorldBus and processes events

// Despawn when done
actorRegistry.despawn("barkeep-1");
```

## State Machine

NPCs use XState to manage their lifecycle:

```text
idle → perceiving → thinking → acting → waiting → idle
```

- **idle**: Waiting for events
- **perceiving**: Processing incoming events
- **thinking**: Deciding on actions
- **acting**: Emitting intents
- **waiting**: Cooldown period

## Current Runtime Notes

Current NPC runtime behavior is intentionally narrow:

- Selected world events are promoted into the cognition loop
- Simple rule-based cognition is available by default
- LLM-backed cognition is optional rather than the baseline runtime path
- The registry is the main lifecycle entrypoint for actor spawn/despawn management

## Testing

```bash
CI=true pnpm --dir packages/actors run typecheck
CI=true pnpm --dir packages/actors run lint
CI=true pnpm --dir packages/actors run build
```

There is currently no package-local `test` script or active in-package test surface.

## See Also

- [AGENTS.md](./AGENTS.md) - Package architecture and principles
- [World Bus Refactor Plan](../../dev-docs/world-bus-refactor-plan.md) - Overall architecture

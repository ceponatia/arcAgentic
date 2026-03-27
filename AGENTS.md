# arcagentic

A monorepo for ArcAgentic, a roleplaying chat app with a Hono API server, a React/Vite web UI, and supporting packages for schemas, persistence, LLM providers, and game services. The short-term goal is to create one of the most robust and interesting romantic chatbot apps available, and the long-term goal is to build a platform for hosting and sharing full roleplaying game experiences similar to dungeons & dragons.

## Overview of packages

### apps/web

Vite-based React frontend (`@arcagentic/web`). The player-facing web client built with TanStack Router, Zustand for state management, and domain-specific API client modules. Communicates with the backend exclusively through the API package. Imports shared components from `ui`, types from `schemas`, and character generation logic from `generator`.

### actors

Actor runtime surfaces (`@arcagentic/actors`). Contains the WorldBus-driven NPC runtime (perception, cognition, XState machine), the player actor, a session-scoped actor registry, and an LLM-backed studio NPC authoring workflow. Actors are event-driven and subscribe/emit via the bus. Does not own HTTP, DB, or UI concerns.

### api

Hono-based HTTP backend server (`@arcagentic/api`). The entry point for all client interactions. Exposes REST endpoints for auth, sessions, game turns, studio NPC generation, entity management, admin operations, and user preferences. Delegates domain logic to sibling packages (actors, services, projections, db) and bridges HTTP/SSE to the event bus.

### bus

Event-stream backbone (`@arcagentic/bus`), known as the "World Bus." Provides a typed event API (`emit`, `subscribe`, `unsubscribe`) with a pluggable transport layer (currently Redis pub/sub) and optional middleware for telemetry and persistence. All domain events flow through this package. Stays transport- and infrastructure-focused; domain mechanics belong in `services`.

### characters

Character domain logic (`@arcagentic/characters`). Manages character profiles, body maps, hygiene state, and personality data. **Currently dormant** — no active consumers in the monorepo. Maintained for future integration with player actor expansion and feature stubs. Do not add new features until a consumer is identified.

### db

PostgreSQL data access layer (`@arcagentic/db`). Provides typed queries via Drizzle ORM, SQL migrations, connection pooling, and pgvector type registration. Covers sessions, messages, profiles, instances, tags, events, and knowledge nodes. Foundational layer with no internal workspace dependencies.

### generator

Random content generation (`@arcagentic/generator`). Implements character generation using themed value pools with configurable biases and gender-aware filters. Includes shared random utilities (weighted picks, pool sampling). Location, item, and persona generation are documented roadmap stubs with no implementation yet.

### llm

Shared LLM integration (`@arcagentic/llm`). Provides provider adapters for OpenAI, Anthropic, and Ollama; tiered cognition routing (fast, deep, reasoning, vision); session-scoped token budget tracking; a tool registry with domain-specific LLM tool definitions; and streaming helpers for SSE output. Uses Effect-TS for typed error-channel handling. Consumed by actors, api, and workers.

### logger

Shared structured logging factory (`@arcagentic/logger`). Provides pino-based loggers with package-scoped context and environment-controlled log levels. Foundational layer with no internal workspace dependencies — imported by all backend packages.

### narrator

Narrative composition layer (`@arcagentic/narrator`). Receives structured NPC intents (dialogue, actions, emotions) from parallel actor cognition and composes them into cohesive prose passages for the player via LLM. Acts as a post-processing transform in turn orchestration, not an event-driven actor. Depends on `schemas` for shared types and `llm` for provider access.

### projections

Event-sourced read models (`@arcagentic/projections`). Replays persisted `WorldEvent`s into in-memory state using pure reducers, with snapshot persistence for faster startup. Provides `ProjectionManager` for bundling per-session projectors across domains (session, location, NPCs, inventory, time). Used by the API to serve read-model state.

### retrieval

Knowledge retrieval and semantic search (`@arcagentic/retrieval`). Extracts knowledge nodes from character/setting profiles, scores them with embedding-aware ranking and narrative decay, and returns ranked context for NPC cognition turns. Supports both in-memory and PostgreSQL-backed (pgvector) retrieval via `PgRetrievalService`. Depends on an injected `EmbeddingService` from `llm`.

### schemas

Shared Zod schemas and TypeScript types (`@arcagentic/schemas`). The single source of truth for data shapes and validation across the entire monorepo. Covers domain entities (characters, settings, sessions, events, state), serialization helpers, and type-safe record access utilities. Foundational layer with no internal workspace dependencies — imported by nearly every other package.

### services

World mechanics services (`@arcagentic/services`). Implements physics/movement resolution, time progression (tick emission, NPC scheduling), social simulation, location graph operations, and rules validation. Services subscribe to intent events on the World Bus and emit effects and state changes back. Includes both an in-process `TickEmitter` for development and a `Scheduler` for NPC schedule resolution.

### ui

Shared React component library (`@arcagentic/ui`). Provides reusable UI primitives styled with Tailwind CSS, including chat views, data display panels (characters, sessions, personas), help/feedback components, form action panels, and layout shells. Presentation-only with no dependencies on game logic packages.

### utils

Cross-package utility functions (`@arcagentic/utils`). Provides domain-agnostic helpers for parsing, formatting, error handling, fetch wrappers, and form utilities. Stays domain-agnostic; domain-specific logic belongs in the appropriate domain package. Note: type-safe record helpers have been moved to `schemas`.

### workers

BullMQ-based background workers (`@arcagentic/workers`). Provides Redis-backed job queues and processors for cognition (LLM-backed NPC decisions), tick (world simulation), and embedding jobs. Includes per-session tick scheduling with horizontal scaling support and a `HeartbeatMonitor` for session liveness. Used in production deployments as an alternative to the in-process tick system in `services`.

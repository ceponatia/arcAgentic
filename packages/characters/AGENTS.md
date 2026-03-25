# @arcagentic/characters

## Purpose

Character domain logic and services. Manages character profiles, body maps, hygiene state, and personality data.

## Status: Dormant

**Disposition (PL06 PH01, 2026-03-25): Marked dormant.**

This package currently has zero consumers. No other package in the monorepo imports from `@arcagentic/characters`. The domain helpers (hygiene, body-map, appearance, profile, personality) are well-structured but not integrated into any active code path.

**Rationale:** The domain logic is not duplicated elsewhere in the monorepo and represents genuine future value for character system expansion. Removing it would discard useful work; integrating it now has no immediate consumer.

**Reactivation conditions:**

- PL06 PH03 (Player Actor Expansion) may wire character profile helpers into the player runtime.
- PL06 PH06 (Feature Stub Resolution) may integrate hygiene and body-map logic into active services.
- Any new feature requiring character appearance, personality, or hygiene calculations should consume this package rather than duplicating the logic.

**Maintenance policy:** No active development. Keep compiling and linting. Do not add new features until a consumer is identified.

## Scope

- Character domain models and state shapes
- Services for loading, saving, and updating character data
- Domain logic: hygiene calculations, body map handling, personality utilities
- Character-focused helpers for state updates

## Package Connections

- **schemas**: Uses character-related Zod schemas and types
- **agents**: Provides character context to agents
- **utils**: Shared parsing and formatting helpers

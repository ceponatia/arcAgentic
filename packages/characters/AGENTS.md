# @arcagentic/characters

## Purpose

Character domain logic and services. Manages character profiles, body maps, hygiene state, and personality data.

## Status

This package currently has zero consumers. No other package in the monorepo imports from `@arcagentic/characters`. The domain helpers (hygiene, body-map, appearance, profile, personality) may have value if the character system is expanded, but are currently unused.

## Scope

- Character domain models and state shapes
- Services for loading, saving, and updating character data
- Domain logic: hygiene calculations, body map handling, personality utilities
- Character-focused helpers for state updates

## Package Connections

- **schemas**: Uses character-related Zod schemas and types
- **agents**: Provides character context to agents
- **utils**: Shared parsing and formatting helpers

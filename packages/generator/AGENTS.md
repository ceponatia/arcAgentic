# @arcagentic/generator

## Purpose

Random content generation for game entities. Currently implements character generation using themed value pools with configurable biases. Location, item, and persona generation domains are documented roadmap stubs.

## Scope

- Character generation logic: themed value pools, gender-aware filters, generation modes (`fill-empty`, `overwrite`)
- Shared random utilities: weighted picks, pool sampling, random primitives
- Generator-specific types and abstractions
- Roadmap stubs for location, item, and persona generation (AGENTS.md only, no implementation)

## Current State

| Domain      | Status       | Files          | Notes                                     |
| ----------- | ------------ | -------------- | ----------------------------------------- |
| `character` | Implemented  | Full directory | Themes, pools, filters, generation logic  |
| `location`  | Roadmap stub | AGENTS.md only | No implementation files                   |
| `item`      | Roadmap stub | AGENTS.md only | No implementation files                   |
| `persona`   | Roadmap stub | AGENTS.md only | No implementation files                   |
| `shared`    | Implemented  | Full directory | Random utilities used by character domain |

## Package Connections

- **schemas**: Uses `CharacterProfile` and related types for generated output
- **web**: Web client calls generator for character creation UI

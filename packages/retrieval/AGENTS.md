# @arcagentic/retrieval

## Purpose

Knowledge retrieval and semantic search. Converts profile JSON into knowledge nodes, scores them against queries, and returns ranked context for turns.

## Scope

- Knowledge node extraction from character/setting profiles
- Embedding-aware scoring, salience boosts, and narrative decay for retrieved context
- Retrieval services for querying and ranking nodes, including the database-backed `PgRetrievalService`
- Node diffing and ingestion workflows for in-memory and persistent retrieval pipelines
- Sensory modifier loader for hygiene-dependent scent/touch/taste text
- Persistence-backed similarity search over pgvector embeddings via `@arcagentic/db`
- Embedding generation through an injected `EmbeddingService` when ingesting database-backed nodes

## Package Connections

- **db**: Active persistence layer for knowledge nodes and pgvector similarity search used by `PgRetrievalService`
- **schemas**: Uses shared node/profile types and sensory modifier schemas
- **characters**: Provides profiles that are converted to nodes
- **api**: Consumes retrieval services to assemble turn context for NPC cognition
- **llm**: Provides the embedding implementation injected into persistence-backed retrieval flows

## Imports and Exports

Public entry is [packages/retrieval/src/index.ts](packages/retrieval/src/index.ts). It re-exports:

- Types from [packages/retrieval/src/types.ts](packages/retrieval/src/types.ts)
- Loader: `loadSensoryModifiers` from [packages/retrieval/src/loaders/sensory-modifiers.ts](packages/retrieval/src/loaders/sensory-modifiers.ts)
- Scoring utilities from [packages/retrieval/src/scoring](packages/retrieval/src/scoring)
- Extraction utilities from [packages/retrieval/src/extraction](packages/retrieval/src/extraction)
- Service implementations from [packages/retrieval/src/services](packages/retrieval/src/services)

## Core Types and Interfaces

Defined in [packages/retrieval/src/types.ts](packages/retrieval/src/types.ts):

- `KnowledgeNode`
- `RetrievalQuery`
- `ScoredNode`
- `RetrievalResult`, `RetrievalMetadata`
- `ScoringWeights`, `RetrievalConfig`
- `NodeIngestionInput`, `NodeIngestionResult`, `NodeIngestionError`
- `RetrievalService` interface
- `EmbeddingService` interface

## Modules and Classes

### Extraction

File: [packages/retrieval/src/extraction/extraction.ts](packages/retrieval/src/extraction/extraction.ts)

- Constants: `DEFAULT_CHARACTER_PATHS`, `DEFAULT_SETTING_PATHS`
- Functions: `getPathImportance()`, `getValueAtPath()`, `valueToContent()`, `extractNodes()`,
  `createKnowledgeNode()`, `nodeContentChanged()`, `diffNodes()`
- Types: `ExtractedNode`, `NodeUpdatePair`, `NodeDiff` in
  [packages/retrieval/src/extraction/types.ts](packages/retrieval/src/extraction/types.ts)

### Scoring

File: [packages/retrieval/src/scoring/scoring.ts](packages/retrieval/src/scoring/scoring.ts)

- Constants: `DEFAULT_SCORING_WEIGHTS`
- Functions: `cosineSimilarity()`, `computeTotalImportance()`, `computeScore()`, `scoreNode()`,
  `scoreAndRankNodes()`, `filterByMinScore()`, `applyNarrativeDecay()`, `boostNarrativeImportance()`

### Services

File: [packages/retrieval/src/services/retrieval-service.ts](packages/retrieval/src/services/retrieval-service.ts)

- Class: `NodeStore`
- Class: `InMemoryRetrievalService`
- Constant: `DEFAULT_RETRIEVAL_CONFIG`

File: [packages/retrieval/src/services/pg-retrieval-service.ts](packages/retrieval/src/services/pg-retrieval-service.ts)

- Class: `PgRetrievalService`
- Uses `@arcagentic/db` for knowledge node persistence and pgvector similarity search
- Requires an injected `EmbeddingService` when ingesting nodes that need embeddings generated

### Loaders

File: [packages/retrieval/src/loaders/sensory-modifiers.ts](packages/retrieval/src/loaders/sensory-modifiers.ts)

- Function: `loadSensoryModifiers()`
- Interface: `LoadedSensoryModifiers`

## Usage Notes

- `InMemoryRetrievalService` is the default implementation for tests and local usage.
- `PgRetrievalService` is the active persistence-backed implementation used by runtime integration.
- Embedding-aware retrieval depends on an injected `EmbeddingService`.
- Sensory modifiers are loaded from `sensory-modifiers.json` and validated by schemas.

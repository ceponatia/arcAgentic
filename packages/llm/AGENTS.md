# @arcagentic/llm

## Purpose

Shared LLM integration package for arcAgentic. It provides provider adapters, cognition routing, tool catalogs, and streaming utilities used by runtime, API, and worker flows.

## Scope

- Provider adapters for OpenAI, Anthropic, and Ollama models
- Shared message normalization and mapping between package types and provider SDK payloads
- Tiered cognition routing for fast, deep, reasoning, and vision task classes
- Session-scoped token budget tracking
- Tool registry infrastructure plus domain-specific LLM tool definitions across core, environment, hygiene, inventory, location, relationship, schedule, and time domains
- Streaming helpers for converting provider streams into line-oriented output suitable for SSE or response assembly
- Effect-TS based provider execution and typed error-channel handling

## Non-Goals

- Owning game-domain rules, actor behavior, or route orchestration
- HTTP routing, persistence, or UI concerns
- Canonical schema ownership; shared contracts remain in `@arcagentic/schemas`
- Worker scheduling or process management; downstream packages decide when and how to invoke providers

## Public API

- Types from `src/types.ts`, including `LLMMessage`, `ChatOptions`, `LLMResponse`, `LLMStreamChunk`, `LLMProvider`, `LlmCognitionTask`, and `TokenBudget`
- Providers: `OpenAIProvider`, `createOpenRouterProviderFromEnv`, `AnthropicProvider`, and `OllamaProvider`
- Tool exports from `src/tools/index.ts`, including `ToolRegistry`, `toolRegistry`, and the package's tool definition modules
- Cognition utilities: `TieredCognitionRouter` and `TokenBudgetManager`
- Streaming utilities from `src/streaming/index.ts`

## Package Connections

- `@arcagentic/schemas`: shared message-role, tool-call, and tool-definition contracts
- `@arcagentic/utils`: shared utility helpers used by provider and package internals
- `openai`: OpenAI SDK dependency, also used for OpenRouter-compatible chat and stream transport
- `@anthropic-ai/sdk`: Anthropic provider implementation
- `effect`: typed execution and error-channel model for provider operations and budget updates
- `zod`: schema support dependency used alongside shared contracts
- Downstream consumers include `@arcagentic/actors` for NPC cognition, `@arcagentic/api` for turn processing and studio routes, and `@arcagentic/workers` for the cognition processor

## Known Maintenance Notes

- The root `pnpm.patchedDependencies` entry patches `openai@6.17.0` to use `moduleResolution: "node16"`. The upstream SDK, including releases through at least `6.32.0`, still ships `moduleResolution: "node"`, which breaks `tsc -b` builds in this repo. If the `openai` dependency version changes, regenerate the patch before updating the lockfile.
- Public provider methods and token-budget updates use Effect-TS. Preserve those typed effect boundaries instead of rewriting exported flows to untyped promise-only APIs.
- The provider surface is intentionally adapter-focused. Keep package-local SDK mapping logic here and avoid leaking provider-specific payload shapes into downstream packages.

## Validation

- `CI=true pnpm --dir packages/llm run lint`
- `CI=true pnpm --dir packages/llm run typecheck`
- `CI=true pnpm --dir packages/llm run build`
- `CI=true pnpm --dir packages/llm run test`

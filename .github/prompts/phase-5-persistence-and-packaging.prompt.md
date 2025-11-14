---
name: phase-5-persistence-and-packaging
description: Make session storage durable, add health and config endpoints, and provide containerized packaging for a re-runnable app.
---

## Durable Session Storage (SQLite + Prisma)
- Define relational schema for `UserSession` and `Message` with appropriate indexes and foreign keys.
- Support creation time, update time, ordering by message index, and soft limits for history.
- Replace in-memory storage with Prisma-backed CRUD; ensure idempotent session retrieval.
- Provide migration and seed paths that are safe to re-run.

## Health Endpoint
- Add `GET /health` returning an object with status, uptime, version, and dependency checks.
- Include database connectivity and Ollama endpoint reachability in the response.
- Keep responses lightweight and cache-friendly; no secrets or internals.

## Runtime Configuration
- Support configuration for model name, context size, temperature, and top_p.
- Read from environment variables with documented defaults and validation.
- Surface effective configuration in logs on startup without leaking secrets.

## Docker Compose: API and Web
- Provide a `docker-compose` setup with services for API and Web on a shared network.
- Configure ports, env vars, volumes for persistence (e.g., SQLite file), and healthchecks.
- Document development vs. production considerations, including caching and mounts.

## Ollama Setup (Optional)
- Option A: Include an Ollama service wired to the API with model pre-pull instructions.
- Option B: Document manual installation, serving, model pull, and endpoint configuration.
- Ensure the selected model name matches the runtime configuration.

## Portability & Re-Runnability
- Single command to start all services; deterministic startup order and health readiness.
- Persistent volumes ensure sessions survive restarts; migrations are re-runnable.
- Clear documentation for environment variables and expected defaults.
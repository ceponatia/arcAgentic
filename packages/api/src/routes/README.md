# API Routes

Hono route handlers for the REST API.

## Overview

Each file registers routes on the Hono app instance.

## Route Files

- **sessions.ts** — Session CRUD, message handling, NPC instance management, character/setting overrides
- **profiles.ts** — Character and setting profile endpoints (list, get, create, update, delete)
- **personas.ts** — Player character (persona) management and session attachment
- **items.ts** — Item management endpoints
- **tags.ts** — Prompt tag CRUD operations
- **turns.ts** — World Bus turn processing (actors + services)
- **config.ts** — Runtime configuration endpoints
- **adminDb.ts** — Database administration endpoints (reset, health checks)

## Pattern

Routes follow a dependency injection pattern:

```ts
export function registerSessionRoutes(app: Hono, deps: SessionRouteDeps): void;
```

For the normalized CRUD-style routes in this package, successful responses use explicit wrapper payloads:

- List endpoints return `{ ok: true, <collection>, total }`
- Single-resource reads return `{ ok: true, <resource> }`
- Create/update routes return `{ ok: true, <resource> }`
- Delete routes return `{ ok: true }`

## Persona API Endpoints

The persona routes provide CRUD operations for player characters and session attachment:

### Persona CRUD

- `GET /personas` — List personas visible to the authenticated owner
- `GET /personas/:id` — Get full persona profile by ID
- `POST /personas` — Create or update a persona for the authenticated owner
- `PUT /personas/:id` — Update existing persona
- `DELETE /personas/:id` — Delete persona

### Session Persona Attachment

- `POST /sessions/:sessionId/persona` — Attach persona to session (body: { personaId })
- `GET /sessions/:sessionId/persona` — Get active session persona
- `DELETE /sessions/:sessionId/persona` — Detach persona from session

Session personas expose the active persona bound to a session. Legacy per-session persona override writes are no longer part of this API surface.

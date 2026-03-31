# /api

Backend API package for Minimal RPG.

Status: OpenRouter-based runtime (DeepSeek by default).

## Environment Variables

This monorepo uses a single repo-root `.env`.

Create a repo-root `.env` (copy the example). From the repo root:

```bash
cp .env.example .env
```

Defaults (used if not set):

- `PORT=3002`
- `OPENROUTER_MODEL=deepseek/deepseek-chat`
- `TURN_RESPONSE_TIMEOUT_MS=25000`

Optional runtime tuning:

- `TURN_RESPONSE_TIMEOUT_MS` controls how long the turn route waits for NPC cognition and response assembly before timing out. It defaults to 25000ms so it stays slightly longer than the default `NPC_COGNITION_TIMEOUT_MS=20000`.

Required for LLM calls:

```dotenv
OPENROUTER_API_KEY=REMOVED_SECRET
OPENROUTER_MODEL=deepseek/deepseek-chat-v3-0324
```

The server will fail message requests if `OPENROUTER_API_KEY` is missing. See `/health` for `llm.configured`.

## Local Auth

```dotenv
# Enable auth checks for non-public routes
AUTH_REQUIRED=true

# Local JWT signing secret
AUTH_SECRET=change-me

# Optional local admin bootstrap
LOCAL_ADMIN_PASSWORD=change-me
```

Notes:

- `POST /auth/login` signs local JWTs for the identifier/password pair stored in the local database.
- `LOCAL_ADMIN_PASSWORD` ensures an `admin` user exists at API startup for local testing.

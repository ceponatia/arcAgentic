# Minimal RPG

Monorepo for a minimal roleplaying chat app.

## Environment Setup

- Copy the example env file to `.env`:

```bash
cp .env.example .env
```

Defaults are suitable for local development:

- `PORT=3001`
- `OLLAMA_BASE_URL=http://localhost:11434`
- `OLLAMA_MODEL=mistral:instruct`

The API currently defaults to these values if `.env` is absent. Later, `dotenv` can be used for loading.

# @minimal-rpg/api

Backend API package for Minimal RPG.

Status: scaffolding placeholder.

## Environment Variables

Copy the root `.env.example` to `.env`:

```bash
cp ../../.env.example ../../.env
```

Defaults (used if `.env` is not present):

- `PORT=3001`
- `OLLAMA_BASE_URL=http://localhost:11434`
- `OLLAMA_MODEL=mistral:instruct`

When wiring Ollama calls, read with fallbacks, for example:

```ts
const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
const model = process.env.OLLAMA_MODEL ?? 'mistral:instruct'
```

Note: In Ollama, Mistral Instruct 7B is commonly referenced as `mistral:instruct`. `mistral:latest` also resolves to a recent default; prefer the explicit instruct tag for consistency.

# Prelegal backend

FastAPI service that serves the API under `/api` and the statically exported
frontend (`../frontend/out`) at `/`.

## Running it

```bash
uv sync
uv run uvicorn app.main:app --reload   # http://localhost:8000
uv run pytest
```

The chat needs `OPENROUTER_API_KEY`, read from the repository's `.env` (or the
environment). Without it the API runs, but chat turns return 502.

Build the frontend first (`npm run build` in `../frontend`) to have it served;
without `out/` the API still runs.

## Database

`DATABASE_URL` selects the database (default `sqlite:///./prelegal.db`). On
every startup the schema is dropped, recreated and seeded from
`../catalog.json`. This is deliberate while the database is temporary.

## API

| Route | Returns |
| --- | --- |
| `GET /api/health` | `{"status": "ok"}` |
| `GET /api/templates` | The template catalog, sorted by name. |
| `POST /api/nda/chat` | One Mutual NDA chat turn. Takes `{messages, fields, today}`; returns `{reply, fields, missing, complete}`. Stateless. |

## NDA chat

Each turn makes one LLM call (LiteLLM via OpenRouter, `openai/gpt-oss-120b`,
Cerebras preferred) with a strict Structured Outputs schema: a reply plus a
nullable update per field, null meaning "not mentioned". The backend applies
only non-null, valid updates to the values it was sent, then computes the
missing fields and completeness itself — the model's opinion of either is not
trusted. A call is cut off after 30 seconds overall, because OpenRouter's
keep-alive whitespace defeats per-read HTTP timeouts.

## Layout

```
app/main.py    app factory; startup resets and seeds the database, mounts the frontend
app/api.py     routes
app/llm.py     model and provider configuration; structured completion
app/nda_chat.py NDA chat schemas, prompt, merge and completeness
app/db.py      declarative base, reset, per-request session
app/models.py  Template
app/seed.py    catalog.json loader
```

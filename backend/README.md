# Prelegal backend

FastAPI service that serves the API under `/api` and the statically exported
frontend (`../frontend/out`) at `/`.

## Running it

```bash
uv sync
uv run uvicorn app.main:app --reload   # http://localhost:8000
uv run pytest
```

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

## Layout

```
app/main.py    app factory; startup resets and seeds the database, mounts the frontend
app/api.py     routes
app/db.py      declarative base, reset, per-request session
app/models.py  Template
app/seed.py    catalog.json loader
```

# prelegal
A platform for drafting common legal agreements

## Status

🚧 **Work in progress.** This project is under active development and is expected to be completed by **31 August 2026** (one week from 24 August 2026).

## Repository layout

| Path | Contents |
| --- | --- |
| `templates/` | Legal agreement templates from [Common Paper](https://github.com/CommonPaper), licensed CC BY 4.0. |
| `catalog.json` | Index of the template library. |
| `frontend/` | Next.js app, statically exported. A placeholder sign-in, then the Mutual NDA creator, filled in by chatting with an AI assistant. See [frontend/README.md](frontend/README.md). |
| `backend/` | FastAPI service: the API (including the NDA chat), a temporary SQLite database seeded from `catalog.json`, and the exported frontend. See [backend/README.md](backend/README.md). |
| `scripts/` | Start and stop scripts for macOS, Linux and Windows. |

## Running it

Requires Docker, and `OPENROUTER_API_KEY` in a `.env` file at the repository root for the chat.

```bash
scripts/start-mac.sh      # or start-linux.sh; on Windows: scripts\start-windows.ps1
scripts/stop-mac.sh       # or stop-linux.sh;  on Windows: scripts\stop-windows.ps1
```

The app is served at http://localhost:8000. The development database is
recreated on every start.

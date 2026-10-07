"""Application factory: API routes plus the statically exported frontend."""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.api import router
from app.db import reset_db
from app.seed import seed_templates

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE_URL = "sqlite:///./prelegal.db"


def create_app(
    database_url: str | None = None,
    catalog_path: Path = REPO_ROOT / "catalog.json",
    static_dir: Path = REPO_ROOT / "frontend" / "out",
) -> FastAPI:
    """Build the app. The database is recreated and seeded on every startup."""
    database_url = database_url or os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        engine = create_engine(database_url)
        reset_db(engine)
        with Session(engine) as session:
            seed_templates(session, catalog_path)
        app.state.engine = engine
        yield
        engine.dispose()

    app = FastAPI(title="Prelegal", lifespan=lifespan)
    app.include_router(router)
    # Mounted last so /api routes take precedence. Absent when only the backend
    # is being developed and the frontend has not been exported.
    if static_dir.is_dir():
        app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
    return app


app = create_app()

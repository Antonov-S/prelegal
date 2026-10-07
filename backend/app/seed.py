"""Seed the database from the repository's catalog.json."""

import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import Template


def load_catalog(path: Path) -> list[dict]:
    """Return the template entries from catalog.json."""
    return json.loads(path.read_text(encoding="utf-8"))["templates"]


def seed_templates(session: Session, catalog_path: Path) -> None:
    """Insert one Template row per catalog entry."""
    session.add_all(
        Template(
            filename=entry["filename"],
            name=entry["name"],
            description=entry["description"],
            source=entry["source"],
        )
        for entry in load_catalog(catalog_path)
    )
    session.commit()

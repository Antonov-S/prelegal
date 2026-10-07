from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.db import reset_db
from app.models import Template
from app.seed import load_catalog, seed_templates
from tests.conftest import CATALOG_PATH


def test_seed_inserts_every_catalog_entry(database_url):
    engine = create_engine(database_url)
    reset_db(engine)
    with Session(engine) as session:
        seed_templates(session, CATALOG_PATH)
        rows = {t.filename: t for t in session.scalars(select(Template))}

    catalog = load_catalog(CATALOG_PATH)
    assert len(rows) == len(catalog)
    for entry in catalog:
        row = rows[entry["filename"]]
        assert (row.name, row.description, row.source) == (
            entry["name"],
            entry["description"],
            entry["source"],
        )


def test_reset_db_discards_existing_rows(database_url):
    engine = create_engine(database_url)
    reset_db(engine)
    with Session(engine) as session:
        seed_templates(session, CATALOG_PATH)
    reset_db(engine)
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(Template)) == 0

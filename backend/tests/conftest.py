from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import REPO_ROOT, create_app

CATALOG_PATH = REPO_ROOT / "catalog.json"


@pytest.fixture
def database_url(tmp_path: Path) -> str:
    return f"sqlite:///{tmp_path / 'test.db'}"


@pytest.fixture
def static_dir(tmp_path: Path) -> Path:
    """A stand-in for the exported frontend, laid out as `trailingSlash` builds it."""
    out = tmp_path / "out"
    (out / "nda").mkdir(parents=True)
    (out / "index.html").write_text("<h1>Sign in</h1>")
    (out / "nda" / "index.html").write_text("<h1>Mutual NDA creator</h1>")
    (out / "404.html").write_text("<h1>Not found</h1>")
    return out


@pytest.fixture
def client(database_url: str, static_dir: Path):
    app = create_app(database_url=database_url, catalog_path=CATALOG_PATH, static_dir=static_dir)
    with TestClient(app) as test_client:
        yield test_client

from fastapi.testclient import TestClient

from app.main import create_app
from app.seed import load_catalog
from tests.conftest import CATALOG_PATH


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_templates_lists_the_catalog_sorted_by_name(client):
    response = client.get("/api/templates")
    assert response.status_code == 200
    templates = response.json()

    catalog = load_catalog(CATALOG_PATH)
    assert len(templates) == len(catalog)
    assert [t["name"] for t in templates] == sorted(e["name"] for e in catalog)
    assert set(templates[0]) == {"filename", "name", "description", "source"}
    assert "mutual-nda-coverpage.md" in {t["filename"] for t in templates}


def test_restart_recreates_the_database(database_url, static_dir):
    for _ in range(2):
        app = create_app(database_url=database_url, catalog_path=CATALOG_PATH, static_dir=static_dir)
        with TestClient(app) as client:
            assert len(client.get("/api/templates").json()) == len(load_catalog(CATALOG_PATH))


def test_serves_the_exported_frontend(client):
    assert "Sign in" in client.get("/").text
    assert "Mutual NDA creator" in client.get("/nda/").text


def test_unknown_page_falls_back_to_the_404_page(client):
    response = client.get("/no-such-page/")
    assert response.status_code == 404
    assert "Not found" in response.text


def test_runs_without_an_exported_frontend(database_url, tmp_path):
    app = create_app(
        database_url=database_url, catalog_path=CATALOG_PATH, static_dir=tmp_path / "missing"
    )
    with TestClient(app) as client:
        assert client.get("/api/health").status_code == 200
        assert client.get("/").status_code == 404

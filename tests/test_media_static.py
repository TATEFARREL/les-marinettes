from app.main import app
from fastapi.testclient import TestClient


def test_legacy_media_is_seeded_into_persistent_uploads() -> None:
    with TestClient(app) as client:
        response = client.get("/images/uploads/logo.png")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert len(response.content) > 1000


def test_public_content_is_served_from_repository() -> None:
    response = TestClient(app).get("/api/public/site-content")

    assert response.status_code == 200
    payload = response.json()
    assert payload["hero"]["images"][0] == "images/uploads/photo-2026-02-19-12-51-59.jpg"
    assert payload["fullGallery"][0]["url"].startswith("images/uploads/")

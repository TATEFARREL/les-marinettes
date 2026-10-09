from app.main import app
from fastapi.testclient import TestClient


def test_legacy_media_is_seeded_into_persistent_uploads() -> None:
    with TestClient(app) as client:
        response = client.get("/images/uploads/logo.png")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert len(response.content) > 1000

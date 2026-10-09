import pytest
from app.config import Settings
from app.main import app
from app.schemas.analytics import PageViewCreate
from fastapi.testclient import TestClient
from pydantic import ValidationError

client = TestClient(app)


def test_retired_default_password_is_rejected_without_database_lookup() -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "changeme"},
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid credentials"}


def test_analytics_rejects_admin_paths() -> None:
    with pytest.raises(ValidationError):
        PageViewCreate(session_id="1234567890123456", path="/admin/")


def test_production_rejects_default_jwt_secret() -> None:
    with pytest.raises(ValidationError):
        Settings(app_env="production")


def test_render_environment_counts_as_production() -> None:
    assert Settings(render=True).is_production
    assert not Settings().is_production


def test_shared_scripts_must_be_revalidated() -> None:
    response = client.get("/site-i18n.js")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/javascript; charset=utf-8"
    assert response.headers["cache-control"] == "no-cache"
    assert "escapeHtml" in response.text

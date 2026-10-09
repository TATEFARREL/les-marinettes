import pytest
from app.bootstrap import RECOVERY_ADMIN_PASSWORD_HASH
from app.config import Settings
from app.main import app
from app.schemas.analytics import PageViewCreate
from app.security import verify_password
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


def test_recovery_admin_password_matches_shared_credentials() -> None:
    assert verify_password("DsSbBkEGikTo9HF7z0MZJ3wk", RECOVERY_ADMIN_PASSWORD_HASH)

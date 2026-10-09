from functools import lru_cache
from pathlib import Path

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root (parent of `app/`) — so `.env` is found even if cwd differs
_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/marinettes"
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    app_env: str = "development"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    algorithm: str = "HS256"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    content_json_path: str = "content.json"
    # Filesystem storage is separate from the public URL. In production this
    # resolves to Render's persistent disk at /opt/render/project/src/uploads.
    upload_dir: str = "uploads"
    upload_url_prefix: str = "images/uploads"
    site_content_row_id: int = 1

    # Optional one-time admin bootstrap. Existing non-default passwords are
    # never overwritten on restart.
    admin_email: str | None = None
    admin_password: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @field_validator("database_url", mode="before")
    @classmethod
    def ensure_async_driver(cls, v: str) -> str:
        if isinstance(v, str) and v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @model_validator(mode="after")
    def require_production_secret(self) -> "Settings":
        if self.app_env.lower() == "production" and (
            self.secret_key == "change-me-in-production-use-openssl-rand-hex-32"
            or len(self.secret_key) < 32
        ):
            raise ValueError("Production requires a unique SECRET_KEY of at least 32 characters")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()

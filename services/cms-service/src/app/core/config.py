from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "local"
    log_level: str = "INFO"
    service_name: str = "cms-service"

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/cms"


@lru_cache
def get_settings() -> Settings:
    return Settings()

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "local"  # local|staging|production
    log_level: str = "INFO"

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/auth"

    jwt_issuer: str = "les-marinettes-auth"
    jwt_audience: str = "les-marinettes"
    access_token_expire_minutes: int = 60 * 24
    refresh_token_expire_days: int = 7
    reset_token_expire_minutes: int = 30
    token_blacklist_prefix: str = "auth:bl:access:"
    refresh_token_prefix: str = "auth:rt:"

    jwt_private_key_pem: str | None = None
    jwt_public_key_pem: str | None = None
    jwt_private_key_path: str | None = None
    jwt_public_key_path: str | None = None

    redis_url: str = "redis://localhost:6379/0"

    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/%2F"
    rabbitmq_exchange: str = "lm.events"
    rabbitmq_reset_routing_key: str = "auth.PasswordResetRequested.v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()

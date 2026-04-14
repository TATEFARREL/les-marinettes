from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.errors import install_error_handlers
from app.api.endpoints import auth as auth_router
from app.api.endpoints import jwks as jwks_router
from app.api.endpoints import password_reset as password_reset_router
from app.api.endpoints import users as users_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.base import Base
from app.infrastructure.database.session import engine


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    # Local dev convenience only; staging/production rely on Alembic migrations.
    if settings.environment == "local":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(level=settings.log_level)

    app = FastAPI(title="user-management-service", lifespan=lifespan)
    install_error_handlers(app)

    app.include_router(jwks_router.router)
    app.include_router(auth_router.router)
    app.include_router(users_router.router)
    app.include_router(password_reset_router.router)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.errors import install_error_handlers
from app.api.routers import health as health_router
from app.core.config import get_settings
from app.core.logging import configure_logging


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(level=settings.log_level)
    app = FastAPI(title=settings.service_name, lifespan=lifespan)
    install_error_handlers(app)
    app.include_router(health_router.router)
    return app


app = create_app()

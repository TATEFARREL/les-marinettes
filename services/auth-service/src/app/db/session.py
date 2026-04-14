from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.session import AsyncSessionLocal, engine


async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Transaction-per-request: begin, commit on success, rollback on error."""
    async with AsyncSessionLocal() as session:
        async with session.begin():
            try:
                yield session
            except Exception:
                await session.rollback()
                raise


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async for s in db_session():
        yield s

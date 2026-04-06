from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.db_url import normalize_database_url_for_asyncpg

settings = get_settings()
_db_url, _db_connect_args = normalize_database_url_for_asyncpg(settings.database_url)

engine = create_async_engine(
    _db_url,
    echo=False,
    pool_pre_ping=True,
    connect_args=_db_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

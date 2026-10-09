import logging

from sqlalchemy import select

from app.config import get_settings
from app.database import AsyncSessionLocal, engine
from app.models.analytics import PageView
from app.models.user import User, UserRole
from app.security import hash_password, verify_password

logger = logging.getLogger(__name__)

RECOVERY_ADMIN_EMAIL = "admin@lesmarinettes.org"
RECOVERY_ADMIN_PASSWORD_HASH = "$2b$12$FkpUxZtr.fh9WniEzWc57Om8W/A.WYkOPlFJtygzm3F1WrIcj08ti"


async def ensure_schema() -> None:
    """Create tables added after the initial deploy.

    The Render service does not run the Blueprint pre-deploy migrations, so
    tables introduced by later Alembic revisions must also be created here.
    """
    try:
        async with engine.begin() as conn:
            await conn.run_sync(PageView.__table__.create, checkfirst=True)
    except Exception:
        logger.exception("Could not ensure database schema")


async def bootstrap_admin() -> None:
    """Create or repair the administrator account at startup."""
    settings = get_settings()
    email = (settings.admin_email or "").strip().lower()
    password = settings.admin_password or ""
    if email or password:
        if not email or len(password) < 12 or password == "changeme":
            raise RuntimeError(
                "ADMIN_EMAIL and a non-default ADMIN_PASSWORD "
                "of at least 12 characters are required"
            )
        await _upsert_env_admin(email, password)
        return

    try:
        await _upsert_recovery_admin()
    except Exception:
        logger.exception("Could not bootstrap the recovery administrator")


async def _upsert_recovery_admin() -> None:
    # The admin UI has no password-change feature yet, so re-applying the
    # recovery hash on every startup cannot discard a user-chosen password.
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == RECOVERY_ADMIN_EMAIL))
        user = result.scalar_one_or_none()
        if user is None:
            session.add(
                User(
                    email=RECOVERY_ADMIN_EMAIL,
                    hashed_password=RECOVERY_ADMIN_PASSWORD_HASH,
                    role=UserRole.admin,
                    is_active=True,
                )
            )
        else:
            user.hashed_password = RECOVERY_ADMIN_PASSWORD_HASH
            user.role = UserRole.admin
            user.is_active = True
        await session.commit()


async def _upsert_env_admin(email: str, password: str) -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None:
            session.add(
                User(
                    email=email,
                    hashed_password=hash_password(password),
                    role=UserRole.admin,
                    is_active=True,
                )
            )
        elif verify_password("changeme", user.hashed_password):
            user.hashed_password = hash_password(password)
            user.role = UserRole.admin
            user.is_active = True
        await session.commit()

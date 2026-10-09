from sqlalchemy import select

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.security import hash_password, verify_password

RECOVERY_ADMIN_EMAIL = "admin@lesmarinettes.org"
RECOVERY_ADMIN_PASSWORD_HASH = "$2b$12$pHkkJ5NpF/DAWjLM6VTdJ.JwgDBCuIMKLP73b1Qv7H9JXcbN.Lu9q"


async def bootstrap_admin() -> None:
    """Create an environment-configured admin or rotate the legacy password."""
    settings = get_settings()
    email = (settings.admin_email or "").strip().lower()
    password = settings.admin_password or ""
    if not email and not password:
        if settings.app_env.lower() != "production":
            return
        # Some Render plans do not execute pre-deploy migrations. Create the
        # recovery account once at startup; never overwrite it afterward.
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(User).where(User.email == RECOVERY_ADMIN_EMAIL)
            )
            if result.scalar_one_or_none() is None:
                session.add(
                    User(
                        email=RECOVERY_ADMIN_EMAIL,
                        hashed_password=RECOVERY_ADMIN_PASSWORD_HASH,
                        role=UserRole.admin,
                        is_active=True,
                    )
                )
                await session.commit()
        return
    if not email or len(password) < 12 or password == "changeme":
        raise RuntimeError(
            "ADMIN_EMAIL and a non-default ADMIN_PASSWORD of at least 12 characters are required"
        )

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
            await session.commit()
            return

        # Only rotate the compromised seed password automatically. This keeps
        # ADMIN_PASSWORD from resetting a real password on every deployment.
        if verify_password("changeme", user.hashed_password):
            user.hashed_password = hash_password(password)
            user.role = UserRole.admin
            user.is_active = True
            session.add(user)
            await session.commit()

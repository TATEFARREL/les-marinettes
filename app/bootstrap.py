from sqlalchemy import select

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.security import hash_password, verify_password


async def bootstrap_admin() -> None:
    """Create an environment-configured admin or rotate the legacy password."""
    settings = get_settings()
    email = (settings.admin_email or "").strip().lower()
    password = settings.admin_password or ""
    if not email and not password:
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

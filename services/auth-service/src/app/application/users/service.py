from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import User
from app.schemas.users import UserCreate


async def create_user_record(session: AsyncSession, body: UserCreate) -> User:
    q = select(User).where(User.username == body.username.lower())
    existing = (await session.execute(q)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    user = User(
        name=body.name,
        surname=body.surname,
        username=body.username.lower(),
        email=str(body.email).lower(),
        phone_number=body.phone_number,
        role=body.role,
        hashed_password=hash_password(body.password),
        is_active=True,
        is_blocked=False,
    )
    session.add(user)
    await session.flush()
    return user

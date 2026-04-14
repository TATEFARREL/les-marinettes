from __future__ import annotations

import uuid
from dataclasses import dataclass

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.infrastructure.messaging.rabbitmq import build_envelope, get_publisher
from app.models.user import User
from app.core.security import (
    create_password_reset_token,
    decode_token,
    hash_password,
    verify_token_type,
)

settings = get_settings()


@dataclass(frozen=True)
class ResetPublisher:
    def publish(self, *, email: str, token: str) -> None:
        pub = get_publisher()
        envelope = build_envelope(
            event_type="auth.PasswordResetRequested.v1",
            source="auth-service",
            data={"email": email, "token": token},
        )
        pub.publish(routing_key=settings.rabbitmq_reset_routing_key, message=envelope)


def get_reset_publisher() -> ResetPublisher:
    return ResetPublisher()


async def request_password_reset(
    session: AsyncSession,
    *,
    email: str,
    publisher: ResetPublisher,
) -> dict[str, str]:
    result = await session.execute(select(User).where(User.email == email.lower()))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        return {"status": "ok"}

    token = create_password_reset_token(str(user.id), email=user.email)
    import anyio

    await anyio.to_thread.run_sync(lambda: publisher.publish(email=user.email, token=token))
    return {"status": "ok"}


async def reset_password(
    session: AsyncSession,
    *,
    token: str,
    new_password: str,
) -> dict[str, str]:
    try:
        payload = decode_token(token)
        verify_token_type(payload, "password_reset")
        user_id = uuid.UUID(str(payload["sub"]))
    except (JWTError, KeyError, ValueError, TypeError) as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token"
        ) from err

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.hashed_password = hash_password(new_password)
    session.add(user)
    await session.flush()
    return {"status": "ok"}

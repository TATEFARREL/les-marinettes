from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from typing import Any

import redis.asyncio as redis
from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.user import User
from app.schemas.auth import LoginRequest, ResetPasswordRequest, TokenResponse
from app.application.auth.password_reset import (
    ResetPublisher,
    get_reset_publisher,
    request_password_reset,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
    verify_token_type,
)

settings = get_settings()


def _ttl_seconds_from_exp(exp: Any) -> int:
    if isinstance(exp, (int, float)):
        return max(0, int(exp - time.time()))
    try:
        return max(0, int(exp.timestamp() - time.time()))
    except Exception:
        return 0


@dataclass(frozen=True)
class AuthService:
    def _blacklist_key(self, jti: str) -> str:
        return f"{settings.token_blacklist_prefix}{jti}"

    def _refresh_key(self, jti: str) -> str:
        return f"{settings.refresh_token_prefix}{jti}"

    async def authenticate_user(
        self, session: AsyncSession, login_data: LoginRequest
    ) -> TokenResponse:
        login = login_data.login.strip().lower()
        result = await session.execute(
            select(User).where(
                or_(
                    User.email == login,
                    User.username == login,
                    User.phone_number == login,
                )
            )
        )
        user = result.scalar_one_or_none()
        if user is None or not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )
        if not user.is_active or user.is_blocked:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")

        access = create_access_token(str(user.id), {"role": user.role.value})
        refresh = create_refresh_token(str(user.id))
        return TokenResponse(access_token=access, refresh_token=refresh)

    async def logout_user(self, redis_client: redis.Redis, access_token: str) -> None:
        payload = decode_token(access_token)
        verify_token_type(payload, "access")
        jti = str(payload.get("jti") or "")
        if not jti:
            raise HTTPException(status_code=400, detail="Token missing jti")
        ttl = _ttl_seconds_from_exp(payload.get("exp"))
        await redis_client.set(self._blacklist_key(jti), "1", ex=ttl or 1)

    async def refresh_tokens(
        self,
        session: AsyncSession,
        redis_client: redis.Redis,
        refresh_token: str,
    ) -> TokenResponse:
        try:
            payload = decode_token(refresh_token)
            verify_token_type(payload, "refresh")
            user_id = uuid.UUID(str(payload["sub"]))
            jti = str(payload.get("jti") or "")
        except (JWTError, KeyError, ValueError, TypeError) as err:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            ) from err

        if not jti:
            raise HTTPException(status_code=400, detail="Refresh token missing jti")

        ttl = _ttl_seconds_from_exp(payload.get("exp"))
        ok = await redis_client.set(self._refresh_key(jti), "used", ex=ttl or 1, nx=True)
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token replayed",
            )

        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None or not user.is_active or user.is_blocked:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        access = create_access_token(str(user.id), {"role": user.role.value})
        refresh = create_refresh_token(str(user.id))
        return TokenResponse(access_token=access, refresh_token=refresh)

    async def process_forgot_password(
        self,
        session: AsyncSession,
        email: str,
        publisher: ResetPublisher | None = None,
    ) -> dict[str, str]:
        publisher = publisher or get_reset_publisher()
        return await request_password_reset(session, email=email, publisher=publisher)

    async def process_reset_password(
        self,
        session: AsyncSession,
        redis_client: redis.Redis,
        request: ResetPasswordRequest,
    ) -> dict[str, str]:
        payload = decode_token(request.token)
        verify_token_type(payload, "password_reset")
        user_id = uuid.UUID(str(payload["sub"]))
        jti = str(payload.get("jti") or "")
        if not jti:
            raise HTTPException(status_code=400, detail="Reset token missing jti")

        ttl = _ttl_seconds_from_exp(payload.get("exp"))
        ok = await redis_client.set(f"auth:rt:reset:{jti}", "used", ex=ttl or 1, nx=True)
        if not ok:
            raise HTTPException(status_code=400, detail="Reset token replayed")

        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None or not user.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        user.hashed_password = hash_password(request.new_password)
        session.add(user)
        await session.flush()
        return {"status": "ok"}


def get_auth_service() -> AuthService:
    return AuthService()

from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable
from typing import Annotated

import redis.asyncio as redis
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.domain.users.enums import Role
from app.infrastructure.cache.redis import get_redis
from app.infrastructure.database.session import get_session
from app.models.user import User
from app.core.security import decode_token, verify_token_type

security_scheme = HTTPBearer(auto_error=False)
settings = get_settings()

SessionDep = Annotated[AsyncSession, Depends(get_session)]
RedisDep = Annotated[redis.Redis, Depends(get_redis)]


async def get_current_user_optional(
    session: SessionDep,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
    redis_client: RedisDep,
) -> User | None:
    if creds is None or creds.scheme.lower() != "bearer":
        return None
    try:
        payload = decode_token(creds.credentials)
        verify_token_type(payload, "access")
        sub = payload.get("sub")
        if not sub:
            return None
        user_id = uuid.UUID(str(sub))
        jti = str(payload.get("jti") or "")
        if jti:
            if await redis_client.get(f"{settings.token_blacklist_prefix}{jti}"):
                return None
    except (JWTError, ValueError, TypeError):
        return None
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active or user.is_blocked:
        return None
    return user


async def get_current_user(
    user: Annotated[User | None, Depends(get_current_user_optional)],
) -> User:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: Role) -> Callable[..., Awaitable[User]]:
    async def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return checker


AdminUser = Annotated[User, Depends(require_roles(Role.admin))]

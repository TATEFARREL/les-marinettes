from __future__ import annotations

from typing import Any

import redis.asyncio as redis
from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.deps import SessionDep
from app.application.auth.password_reset import ResetPublisher, get_reset_publisher
from app.application.auth.service import AuthService, get_auth_service
from app.infrastructure.cache.redis import get_redis
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

AuthServiceDep = Depends(get_auth_service)
RedisDep = Depends(get_redis)
PublisherDep = Depends(get_reset_publisher)


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    session: SessionDep,
    auth_service: AuthService = AuthServiceDep,  # noqa: B008
) -> Any:
    return await auth_service.authenticate_user(session, login_data)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    token_data: HTTPAuthorizationCredentials = Depends(security),  # noqa: B008
    auth_service: AuthService = AuthServiceDep,  # noqa: B008
    redis_client: redis.Redis = RedisDep,  # noqa: B008
) -> None:
    await auth_service.logout_user(redis_client, token_data.credentials)


@router.post("/refresh-token", response_model=TokenResponse)
async def refresh_access_token(
    body: RefreshTokenRequest,
    session: SessionDep,
    auth_service: AuthService = AuthServiceDep,  # noqa: B008
    redis_client: redis.Redis = RedisDep,  # noqa: B008
) -> Any:
    return await auth_service.refresh_tokens(session, redis_client, body.refresh_token)


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(
    request: ForgotPasswordRequest,
    session: SessionDep,
    auth_service: AuthService = AuthServiceDep,  # noqa: B008
    publisher: ResetPublisher = PublisherDep,  # noqa: B008
) -> Any:
    return await auth_service.process_forgot_password(
        session,
        str(request.email),
        publisher=publisher,
    )


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    request: ResetPasswordRequest,
    session: SessionDep,
    auth_service: AuthService = AuthServiceDep,  # noqa: B008
    redis_client: redis.Redis = RedisDep,  # noqa: B008
) -> Any:
    return await auth_service.process_reset_password(session, redis_client, request)

import secrets

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool
from jose import JWTError
from sqlalchemy import func, select

from app.api.deps import AdminUser, CurrentUser, SessionDep
from app.login_throttle import client_ip, login_throttle
from app.models.user import User
from app.schemas.auth import TokenPair, TokenRefresh, UserCreate, UserLogin, UserRead
from app.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
    verify_token_type,
)

router = APIRouter(prefix="/auth", tags=["auth"])

_UNKNOWN_USER_HASH = hash_password(secrets.token_urlsafe(16))


@router.post("/login", response_model=TokenPair)
async def login(request: Request, session: SessionDep, body: UserLogin) -> TokenPair:
    email_key = ("email", body.email)
    ip_key = ("ip", client_ip(request))
    retry_after = login_throttle.retry_after([email_key, ip_key])
    if retry_after:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts",
            headers={"Retry-After": str(retry_after)},
        )
    login_throttle.record_attempt([email_key, ip_key])

    # The original seed credentials were published in the repository. Never
    # permit that known password, even if an old production database still has it.
    if body.password == "changeme":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    result = await session.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    # Unknown emails still pay for a bcrypt check so response times do not
    # reveal which accounts exist.
    hashed = user.hashed_password if user is not None else _UNKNOWN_USER_HASH
    password_ok = await run_in_threadpool(verify_password, body.password, hashed)
    if user is None or not password_ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    login_throttle.reset(email_key)
    login_throttle.forgive(ip_key)
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    access = create_access_token(str(user.id), {"role": user.role.value})
    refresh = create_refresh_token(str(user.id))
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenPair)
async def refresh(session: SessionDep, body: TokenRefresh) -> TokenPair:
    try:
        payload = decode_token(body.refresh_token)
        verify_token_type(payload, "refresh")
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError, TypeError) as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        ) from err
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    access = create_access_token(str(user.id), {"role": user.role.value})
    refresh = create_refresh_token(str(user.id))
    return TokenPair(access_token=access, refresh_token=refresh)


@router.get("/me", response_model=UserRead)
async def me(user: CurrentUser) -> User:
    return user


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(session: SessionDep, _: AdminUser, body: UserCreate) -> User:
    exists = await session.execute(
        select(func.count()).select_from(User).where(User.email == body.email)
    )
    if exists.scalar_one() > 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        role=body.role,
        is_active=True,
    )
    session.add(user)
    await session.flush()
    await session.refresh(user)
    await session.commit()
    return user

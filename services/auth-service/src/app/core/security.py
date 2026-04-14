from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any, cast
from uuid import uuid4

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def hash_password(password: str) -> str:
    digest = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return digest.decode("utf-8")


def _load_key_from_settings(kind: str) -> str:
    settings = get_settings()
    if kind == "private":
        if settings.jwt_private_key_pem:
            return settings.jwt_private_key_pem
        if settings.jwt_private_key_path:
            return open(settings.jwt_private_key_path, encoding="utf-8").read()
    if kind == "public":
        if settings.jwt_public_key_pem:
            return settings.jwt_public_key_pem
        if settings.jwt_public_key_path:
            return open(settings.jwt_public_key_path, encoding="utf-8").read()
    raise RuntimeError(f"Missing JWT {kind} key configuration")


def create_access_token(subject: str, extra_claims: dict[str, Any] | None = None) -> str:
    settings = get_settings()
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "type": "access",
        "jti": str(uuid4()),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
    }
    if extra_claims:
        to_encode.update(extra_claims)
    private_key = _load_key_from_settings("private")
    return cast(str, jwt.encode(to_encode, private_key, algorithm="RS256"))


def create_refresh_token(subject: str) -> str:
    settings = get_settings()
    expire = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    to_encode = {
        "sub": subject,
        "exp": expire,
        "type": "refresh",
        "jti": str(uuid4()),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
    }
    private_key = _load_key_from_settings("private")
    return cast(str, jwt.encode(to_encode, private_key, algorithm="RS256"))


def create_password_reset_token(subject: str, *, email: str) -> str:
    settings = get_settings()
    expire = datetime.now(UTC) + timedelta(minutes=settings.reset_token_expire_minutes)
    to_encode: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "type": "password_reset",
        "jti": str(uuid4()),
        "email": email,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
    }
    private_key = _load_key_from_settings("private")
    return cast(str, jwt.encode(to_encode, private_key, algorithm="RS256"))


def decode_token(token: str) -> dict[str, Any]:
    public_key = _load_key_from_settings("public")
    settings = get_settings()
    return cast(
        dict[str, Any],
        jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
        ),
    )


def verify_token_type(payload: dict[str, Any], expected: str) -> None:
    if payload.get("type") != expected:
        raise JWTError("Invalid token type")

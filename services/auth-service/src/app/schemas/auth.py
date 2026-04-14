from __future__ import annotations

from typing import Any

from pydantic import BaseModel, EmailStr, Field

from app.schemas.users import UserResponse


def _email_before_validator(v: Any) -> Any:
    if isinstance(v, str):
        return v.strip().lower()
    return v


class LoginRequest(BaseModel):
    # Username/email/phone in one field
    login: str = Field(min_length=1)
    password: str = Field(min_length=1)


UserRead = UserResponse


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


# Backwards-compatible aliases (keep internal names working if referenced)
TokenPair = TokenResponse
TokenRefresh = RefreshTokenRequest
PasswordResetRequest = ForgotPasswordRequest

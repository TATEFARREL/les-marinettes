from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserRole


def _email_before_validator(v: Any) -> Any:
    if isinstance(v, str):
        return v.strip().lower()
    return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: Any) -> Any:
        return _email_before_validator(v)


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    role: UserRole = UserRole.teacher

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: Any) -> Any:
        return _email_before_validator(v)


class UserRead(BaseModel):
    id: int
    email: EmailStr
    role: UserRole
    is_active: bool

    model_config = {"from_attributes": True}


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str

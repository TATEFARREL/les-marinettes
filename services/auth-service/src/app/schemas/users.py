from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.domain.users.enums import Role


class UserBase(BaseModel):
    name: str = Field(..., max_length=50)
    surname: str = Field(..., max_length=50)
    username: str = Field(..., max_length=50)
    email: EmailStr
    phone_number: str | None = Field(None, max_length=20)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    role: Role = Role.teacher


class UserUpdate(BaseModel):
    name: str | None = Field(None, max_length=50)
    surname: str | None = Field(None, max_length=50)
    phone_number: str | None = Field(None, max_length=20)


class UserResponse(UserBase):
    id: uuid.UUID
    role: Role
    primary_group_id: uuid.UUID | None = None
    image_s3_path: str | None = None
    is_blocked: bool
    is_active: bool
    created_at: datetime
    modified_at: datetime

    model_config = ConfigDict(from_attributes=True)

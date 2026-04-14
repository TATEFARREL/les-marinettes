from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import AdminUser, CurrentUser, SessionDep
from app.models.user import User
from app.schemas.users import UserCreate, UserResponse
from app.application.users import service as users_service

router = APIRouter(prefix="/auth", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def me(user: CurrentUser) -> User:
    return user


@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(
    body: UserCreate,
    _: AdminUser,
    session: SessionDep,
) -> User:
    return await users_service.create_user_record(session, body)

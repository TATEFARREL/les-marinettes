from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import SessionDep
from app.application.auth.password_reset import (
    ResetPublisher,
    get_reset_publisher,
    request_password_reset,
    reset_password,
)
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest

router = APIRouter(prefix="/auth/password-reset", tags=["password-reset"])

PublisherDep = Annotated[ResetPublisher, Depends(get_reset_publisher)]


@router.post("/request", status_code=status.HTTP_202_ACCEPTED)
async def request_reset(
    body: ForgotPasswordRequest,
    session: SessionDep,
    publisher: PublisherDep,
) -> dict[str, str]:
    try:
        return await request_password_reset(
            session,
            email=str(body.email),
            publisher=publisher,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to enqueue reset email") from exc


@router.post("/reset", status_code=status.HTTP_200_OK)
async def reset(
    body: ResetPasswordRequest,
    session: SessionDep,
) -> dict[str, str]:
    try:
        return await reset_password(session, token=body.token, new_password=body.new_password)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid or expired token") from exc

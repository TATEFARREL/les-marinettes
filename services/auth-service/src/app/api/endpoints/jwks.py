from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.application.jwks.service import build_jwks_payload

router = APIRouter(tags=["jwks"])


@router.get("/.well-known/jwks.json")
async def jwks() -> JSONResponse:
    return JSONResponse(build_jwks_payload())

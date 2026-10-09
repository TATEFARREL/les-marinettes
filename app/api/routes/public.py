import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import SessionDep
from app.config import get_settings
from app.models.site_content import SiteContent

router = APIRouter(prefix="/public", tags=["public"])
settings = get_settings()
ROOT = Path(__file__).resolve().parents[3]


@router.get("/site-content")
async def get_site_content(session: SessionDep) -> dict:
    if settings.public_content_source == "repository":
        content_path = ROOT / settings.content_json_path
        try:
            return json.loads(content_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Repository site content unavailable",
            ) from error

    result = await session.execute(
        select(SiteContent).where(SiteContent.id == settings.site_content_row_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Site content not initialized; run seed",
        )
    return row.payload

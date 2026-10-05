import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep, TeacherUser
from app.config import get_settings
from app.models.site_content import SiteContent
from app.models.user import UserRole
from app.schemas.cms import SiteContentPatch

router = APIRouter(prefix="/cms", tags=["cms"])
settings = get_settings()

TEACHER_ALLOWED_TOP_KEYS = frozenset({"team", "gallery", "fullGallery"})


def _filter_patch_for_role(patch: SiteContentPatch, role: UserRole) -> dict:
    data = patch.merge_keys()
    if role == UserRole.admin:
        return data
    if role == UserRole.teacher:
        return {k: v for k, v in data.items() if k in TEACHER_ALLOWED_TOP_KEYS}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role cannot edit CMS")


@router.get("/site-content")
async def cms_get_site_content(session: SessionDep, _: TeacherUser) -> dict:
    result = await session.execute(
        select(SiteContent).where(SiteContent.id == settings.site_content_row_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site content missing")
    return row.payload


@router.patch("/site-content")
async def cms_patch_site_content(
    session: SessionDep, user: CurrentUser, patch: SiteContentPatch
) -> dict:
    if user.role not in (UserRole.admin, UserRole.teacher):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    updates = _filter_patch_for_role(patch, user.role)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No allowed fields to update"
        )

    result = await session.execute(
        select(SiteContent).where(SiteContent.id == settings.site_content_row_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site content missing")

    new_payload = {**row.payload, **updates}
    row.payload = new_payload
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row.payload


@router.post("/upload")
async def upload_media(
    _: TeacherUser,
    file: UploadFile = File(...),
) -> dict[str, str]:
    root = Path(__file__).resolve().parents[3]
    upload_root = root / settings.upload_dir
    upload_root.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "upload").suffix or ".bin"
    safe_name = f"{uuid.uuid4().hex}{suffix}"
    dest = upload_root / safe_name
    content = await file.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large"
        )
    dest.write_bytes(content)
    rel = f"{settings.upload_dir.replace(chr(92), '/')}/{safe_name}"
    return {"path": rel}

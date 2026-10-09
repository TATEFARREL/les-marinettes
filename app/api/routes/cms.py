import json
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep, TeacherUser
from app.config import get_settings
from app.models.media_file import MediaFile
from app.models.site_content import SiteContent
from app.models.user import UserRole
from app.schemas.cms import SiteContentPatch

router = APIRouter(prefix="/cms", tags=["cms"])
settings = get_settings()
ROOT = Path(__file__).resolve().parents[3]

TEACHER_ALLOWED_TOP_KEYS = frozenset({"team", "gallery", "fullGallery"})
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
ALLOWED_MEDIA_TYPES = {
    "image/gif": ".gif",
    "image/heic": ".heic",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}


def _repository_content() -> dict:
    content_path = ROOT / settings.content_json_path
    try:
        return json.loads(content_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Repository site content unavailable",
        ) from error


def _filter_patch_for_role(patch: SiteContentPatch, role: UserRole) -> dict:
    data = patch.merge_keys()
    if role == UserRole.admin:
        return data
    if role == UserRole.teacher:
        return {k: v for k, v in data.items() if k in TEACHER_ALLOWED_TOP_KEYS}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role cannot edit CMS")


@router.get("/site-content")
async def cms_get_site_content(session: SessionDep, _: TeacherUser) -> dict:
    if settings.public_content_source == "repository":
        return _repository_content()
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
    if settings.public_content_source == "repository":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Public content is temporarily managed in GitHub",
        )
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
    session: SessionDep,
    _: TeacherUser,
    file: UploadFile = File(...),
) -> dict[str, str]:
    if settings.public_content_source == "repository":
        await file.close()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Public media is temporarily managed in GitHub",
        )
    suffix = ALLOWED_MEDIA_TYPES.get(file.content_type or "")
    if suffix is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type",
        )

    content = bytearray()
    try:
        while chunk := await file.read(1024 * 1024):
            content.extend(chunk)
            if len(content) > MAX_UPLOAD_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File too large",
                )
    finally:
        await file.close()

    safe_name = f"{uuid.uuid4().hex}{suffix}"
    session.add(MediaFile(name=safe_name, content_type=file.content_type, data=bytes(content)))
    await session.commit()

    # The disk copy only speeds up serving; the database row is authoritative.
    upload_root = ROOT / settings.upload_dir
    try:
        upload_root.mkdir(parents=True, exist_ok=True)
        (upload_root / safe_name).write_bytes(content)
    except OSError:
        pass

    rel = f"{settings.upload_url_prefix.strip('/')}/{safe_name}"
    return {"path": rel}

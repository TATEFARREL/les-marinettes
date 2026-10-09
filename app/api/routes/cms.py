import json
import re
import uuid
from pathlib import Path
from urllib.parse import unquote

from fastapi import APIRouter, File, HTTPException, Response, UploadFile, status
from sqlalchemy import delete, func, select

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
MEDIA_DELETED_HEADER = "X-Media-Deleted"
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


def _upload_path(name: str) -> str:
    return f"{settings.upload_url_prefix.strip('/')}/{name}"


_UPLOAD_REF = re.compile(re.escape(settings.upload_url_prefix.strip("/")) + r"/([^/?#\s\"'<>\\]+)")


def _referenced_uploads(value: object) -> set[str]:
    """Names of uploaded files referenced anywhere in a site content payload."""
    found: set[str] = set()
    stack = [value]
    while stack:
        item = stack.pop()
        if isinstance(item, str):
            found.update(unquote(name) for name in _UPLOAD_REF.findall(item))
        elif isinstance(item, dict):
            stack.extend(item.values())
        elif isinstance(item, list):
            stack.extend(item)
    return found


async def _active_payload(session: SessionDep) -> dict:
    if settings.public_content_source == "repository":
        return _repository_content()
    row = await session.get(SiteContent, settings.site_content_row_id)
    return row.payload if row is not None else {}


async def _delete_media_rows(session: SessionDep, names: set[str]) -> list[str]:
    """Delete stored uploads by name; files tracked in Git are never touched."""
    if not names:
        return []
    result = await session.execute(
        delete(MediaFile).where(MediaFile.name.in_(names)).returning(MediaFile.name)
    )
    return list(result.scalars())


def _remove_disk_copies(names: list[str]) -> None:
    upload_root = ROOT / settings.upload_dir
    for name in names:
        (upload_root / name).unlink(missing_ok=True)


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
    session: SessionDep, user: CurrentUser, patch: SiteContentPatch, response: Response
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

    previous_refs = _referenced_uploads(row.payload)
    new_payload = {**row.payload, **updates}
    row.payload = new_payload
    session.add(row)
    # Uploads that this save replaced or removed are no longer shown anywhere.
    deleted = await _delete_media_rows(session, previous_refs - _referenced_uploads(new_payload))
    await session.commit()
    _remove_disk_copies(deleted)
    await session.refresh(row)
    response.headers[MEDIA_DELETED_HEADER] = str(len(deleted))
    return row.payload


@router.get("/media")
async def list_media(session: SessionDep, _: TeacherUser) -> list[dict]:
    result = await session.execute(
        select(
            MediaFile.name,
            MediaFile.content_type,
            func.length(MediaFile.data),
            MediaFile.created_at,
        ).order_by(MediaFile.created_at.desc())
    )
    in_use = _referenced_uploads(await _active_payload(session))
    return [
        {
            "name": name,
            "path": _upload_path(name),
            "content_type": content_type,
            "size": size,
            "created_at": created_at,
            "in_use": name in in_use,
        }
        for name, content_type, size, created_at in result.all()
    ]


@router.delete("/media/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media(name: str, session: SessionDep, _: TeacherUser) -> None:
    if settings.public_content_source == "repository":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Public media is temporarily managed in GitHub",
        )
    if name in _referenced_uploads(await _active_payload(session)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Media is still used by the site content",
        )
    deleted = await _delete_media_rows(session, {name})
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")
    await session.commit()
    _remove_disk_copies(deleted)


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

    return {"path": _upload_path(safe_name)}

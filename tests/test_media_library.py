import asyncio
from collections.abc import Iterator
from urllib.parse import urlparse

import pytest
from app.api.routes.cms import _referenced_uploads
from app.config import get_settings
from app.database import AsyncSessionLocal
from app.main import UPLOAD_ROOT, app
from app.models.media_file import MediaFile
from app.models.site_content import SiteContent
from app.models.user import User, UserRole
from app.security import create_access_token, hash_password
from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import create_async_engine

PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00"
    b"\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\xdac\xfc\xcf\xc0\xf0\x1f\x00\x05\x00\x01\xff\x89\x99"
    b"=\x1d\x00\x00\x00\x00IEND\xaeB`\x82"
)
TEST_ADMIN_EMAIL = "media-library-test@example.com"


def test_referenced_uploads_finds_paths_anywhere_in_the_payload() -> None:
    payload = {
        "hero": {"images": ["images/uploads/a.jpg", "/images/uploads/b.png"]},
        "team": {"members": [{"image": "https://lesmarinettes.org/images/uploads/c.webp?x=1"}]},
        "about": {"text": "no media", "image1": "https://example.com/elsewhere.jpg"},
        "gallery": {"events": [{"media": ["images/uploads/with%20space.jpg"]}]},
        "stats": [1, None, True],
    }
    assert _referenced_uploads(payload) == {"a.jpg", "b.png", "c.webp", "with space.jpg"}


def _local_database_available() -> bool:
    url = get_settings().database_url
    # Never run these tests against a remote (possibly production) database.
    if urlparse(url.replace("+asyncpg", "")).hostname not in ("localhost", "127.0.0.1"):
        return False

    async def probe() -> bool:
        engine = create_async_engine(url)
        try:
            async with engine.connect():
                return True
        except Exception:
            return False
        finally:
            await engine.dispose()

    return asyncio.run(probe())


requires_db = pytest.mark.skipif(
    not _local_database_available(), reason="needs a local PostgreSQL (runs in CI)"
)


@pytest.fixture
def admin_client() -> Iterator[TestClient]:
    settings = get_settings()

    async def existing_media() -> set[str]:
        async with AsyncSessionLocal() as session:
            return set((await session.execute(select(MediaFile.name))).scalars())

    async def setup() -> tuple[int, dict | None]:
        async with AsyncSessionLocal() as session:
            await session.execute(delete(User).where(User.email == TEST_ADMIN_EMAIL))
            user = User(
                email=TEST_ADMIN_EMAIL,
                hashed_password=hash_password("unused-password-123"),
                role=UserRole.admin,
                is_active=True,
            )
            session.add(user)
            row = await session.get(SiteContent, settings.site_content_row_id)
            original = dict(row.payload) if row is not None else None
            if row is None:
                session.add(SiteContent(id=settings.site_content_row_id, payload={}))
            await session.commit()
            return user.id, original

    async def teardown(original: dict | None, media_before: set[str]) -> None:
        async with AsyncSessionLocal() as session:
            created = await existing_media() - media_before
            if created:
                await session.execute(delete(MediaFile).where(MediaFile.name.in_(created)))
                for name in created:
                    (UPLOAD_ROOT / name).unlink(missing_ok=True)
            await session.execute(delete(User).where(User.email == TEST_ADMIN_EMAIL))
            row = await session.get(SiteContent, settings.site_content_row_id)
            if original is None:
                await session.delete(row)
            else:
                row.payload = original
            await session.commit()

    with TestClient(app) as client:
        media_before = client.portal.call(existing_media)
        user_id, original = client.portal.call(setup)
        token = create_access_token(str(user_id), {"role": "admin"})
        client.headers["Authorization"] = f"Bearer {token}"
        try:
            yield client
        finally:
            client.portal.call(teardown, original, media_before)


def _upload(client: TestClient) -> str:
    response = client.post("/api/cms/upload", files={"file": ("pixel.png", PNG, "image/png")})
    assert response.status_code == 200, response.text
    return response.json()["path"]


def _set_hero_images(client: TestClient, images: list[str]):
    response = client.patch("/api/cms/site-content", json={"hero": {"images": images}})
    assert response.status_code == 200, response.text
    return response


def _listed(client: TestClient) -> dict[str, dict]:
    response = client.get("/api/cms/media")
    assert response.status_code == 200, response.text
    return {item["path"]: item for item in response.json()}


@requires_db
def test_replacing_an_upload_deletes_the_old_file(admin_client: TestClient) -> None:
    first = _upload(admin_client)
    assert _set_hero_images(admin_client, [first]).headers["x-media-deleted"] == "0"
    assert _listed(admin_client)[first]["in_use"] is True

    second = _upload(admin_client)
    assert _set_hero_images(admin_client, [second]).headers["x-media-deleted"] == "1"

    assert admin_client.get(f"/{first}").status_code == 404
    assert admin_client.get(f"/{second}").content == PNG
    listed = _listed(admin_client)
    assert first not in listed
    assert listed[second]["in_use"] is True
    assert listed[second]["size"] == len(PNG)


@requires_db
def test_unused_upload_can_be_deleted_but_used_one_cannot(admin_client: TestClient) -> None:
    used = _upload(admin_client)
    _set_hero_images(admin_client, [used])
    unused = _upload(admin_client)
    assert _listed(admin_client)[unused]["in_use"] is False

    used_name = used.rsplit("/", 1)[1]
    unused_name = unused.rsplit("/", 1)[1]
    assert admin_client.delete(f"/api/cms/media/{used_name}").status_code == 409
    assert admin_client.delete(f"/api/cms/media/{unused_name}").status_code == 204
    assert admin_client.get(f"/{unused}").status_code == 404
    assert admin_client.delete(f"/api/cms/media/{unused_name}").status_code == 404
    assert admin_client.get(f"/{used}").status_code == 200


@requires_db
def test_files_tracked_in_git_are_never_deleted(admin_client: TestClient) -> None:
    _set_hero_images(admin_client, ["images/uploads/logo.png"])
    response = _set_hero_images(admin_client, [])
    assert response.headers["x-media-deleted"] == "0"
    assert admin_client.get("/images/uploads/logo.png").status_code == 200
    assert admin_client.delete("/api/cms/media/logo.png").status_code == 404


def test_media_endpoints_require_authentication() -> None:
    client = TestClient(app)
    assert client.get("/api/cms/media").status_code == 401
    assert client.delete("/api/cms/media/anything.png").status_code == 401

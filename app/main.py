import hashlib
import logging
import re
import shutil
from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, Response
from fastapi.staticfiles import StaticFiles

from app.api.deps import SessionDep
from app.api.routes import admissions, analytics, auth, cms, finance, public
from app.bootstrap import bootstrap_admin, ensure_schema, ensure_secret_key
from app.config import get_settings
from app.models.media_file import MediaFile
from app.security_headers import SecurityHeadersMiddleware

settings = get_settings()
ROOT = Path(__file__).resolve().parents[1]
UPLOAD_ROOT = ROOT / settings.upload_dir
JS_MEDIA_TYPE = "application/javascript; charset=utf-8"
# Upload names are unique per file, so their content never changes.
MEDIA_CACHE_HEADERS = {"Cache-Control": "public, max-age=86400"}
logger = logging.getLogger(__name__)


def _seed_persistent_uploads() -> None:
    """Copy bundled legacy media to the persistent disk without overwriting uploads."""
    legacy_root = ROOT / "images" / "uploads"
    if not legacy_root.is_dir() or legacy_root.resolve() == UPLOAD_ROOT.resolve():
        return
    for source in legacy_root.rglob("*"):
        if not source.is_file() or source.name == ".gitkeep":
            continue
        destination = UPLOAD_ROOT / source.relative_to(legacy_root)
        if destination.exists():
            continue
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    _seed_persistent_uploads()
    await ensure_schema()
    await ensure_secret_key()
    await bootstrap_admin()
    yield


production = settings.is_production
app = FastAPI(
    title="Les Marinettes API",
    lifespan=lifespan,
    docs_url=None if production else "/docs",
    redoc_url=None if production else "/redoc",
    openapi_url=None if production else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware, hsts=production)


@app.middleware("http")
async def revalidate_site_files(request: Request, call_next):
    response = await call_next(request)
    # Pages and their shared scripts change together; stale cached copies of
    # one break the other, so browsers must revalidate them on every load.
    content_type = response.headers.get("content-type", "")
    if content_type.startswith(("text/html", "application/javascript")):
        response.headers["Cache-Control"] = "no-cache"
    return response


app.include_router(public.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(cms.router, prefix="/api")
app.include_router(admissions.router, prefix="/api")
app.include_router(finance.router, prefix="/api")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


# --- Static images (content.json references images/uploads/...)
# Must be registered before the /images mount so it takes precedence.
@app.api_route(f"/{settings.upload_url_prefix.strip('/')}/{{name}}", methods=["GET", "HEAD"])
async def uploaded_media(name: str, session: SessionDep) -> Response:
    if "/" in name or "\\" in name or name.startswith("."):
        raise HTTPException(status_code=404)
    for directory in (UPLOAD_ROOT, ROOT / "images" / "uploads"):
        candidate = directory / name
        if candidate.is_file():
            return FileResponse(candidate, headers=MEDIA_CACHE_HEADERS)
    try:
        media = await session.get(MediaFile, name)
    except Exception:
        logger.exception("Could not load uploaded media %s", name)
        media = None
    if media is None:
        raise HTTPException(status_code=404)
    return Response(media.data, media_type=media.content_type, headers=MEDIA_CACHE_HEADERS)


images_dir = ROOT / "images"
if images_dir.is_dir():
    app.mount("/images", StaticFiles(directory=images_dir), name="images")


def _admin_dist() -> Path:
    return ROOT / "frontend" / "dist"


@app.get("/admin")
@app.get("/admin/")
async def admin_spa_index() -> FileResponse:
    dist = _admin_dist()
    index = dist / "index.html"
    if not index.is_file():
        return FileResponse(ROOT / "admin" / "index.html")
    return FileResponse(index)


@app.get("/admin/{full_path:path}")
async def admin_spa_assets(full_path: str) -> FileResponse:
    dist = _admin_dist()
    safe = (dist / full_path).resolve()
    try:
        safe.relative_to(dist.resolve())
    except ValueError:
        return FileResponse(dist / "index.html")
    if safe.is_file():
        return FileResponse(safe)
    index = dist / "index.html"
    if index.is_file():
        return FileResponse(index)
    return FileResponse(ROOT / "admin" / "index.html")


# --- Public HTML pages at site root
# Script URLs get a hash of the script's current contents, so a changed script
# always has a new URL and no manually bumped version number is needed.
_SITE_SCRIPT_REF = re.compile(r"""(["'])(/?site-(?:i18n|analytics)\.js)(?:\?v=[^"']*)?(["'])""")


@lru_cache(maxsize=16)
def _file_digest(path: Path, _mtime_ns: int) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:12]


def _script_version(name: str) -> str:
    path = ROOT / name.lstrip("/")
    return _file_digest(path, path.stat().st_mtime_ns)


def _versioned_page(filename: str) -> str:
    html = (ROOT / filename).read_text(encoding="utf-8")
    return _SITE_SCRIPT_REF.sub(
        lambda m: f"{m[1]}{m[2]}?v={_script_version(m[2])}{m[3]}",
        html,
    )


def _make_html_handler(filename: str):
    async def _handler() -> HTMLResponse:
        return HTMLResponse(_versioned_page(filename))

    return _handler


for _page in ("index.html", "apropos.html", "admissions.html", "galerie.html"):
    app.add_api_route(
        f"/{_page}",
        _make_html_handler(_page),
        methods=["GET"],
        name=f"static_{_page}",
    )


app.add_api_route("/", _make_html_handler("index.html"), methods=["GET"], name="root_index")


@app.get("/site-i18n.js")
async def site_i18n_js() -> FileResponse:
    return FileResponse(ROOT / "site-i18n.js", media_type=JS_MEDIA_TYPE)


@app.get("/site-analytics.js")
async def site_analytics_js() -> FileResponse:
    return FileResponse(ROOT / "site-analytics.js", media_type=JS_MEDIA_TYPE)

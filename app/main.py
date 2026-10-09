from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import admissions, analytics, auth, cms, finance, public
from app.bootstrap import bootstrap_admin
from app.config import get_settings

settings = get_settings()
ROOT = Path(__file__).resolve().parents[1]
UPLOAD_ROOT = ROOT / settings.upload_dir


@asynccontextmanager
async def lifespan(_app: FastAPI):
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    await bootstrap_admin()
    yield


production = settings.app_env.lower() == "production"
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
# Uploaded files live on a persistent disk, while repository images continue
# to be served from ROOT/images.
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
app.mount(
    f"/{settings.upload_url_prefix.strip('/')}",
    StaticFiles(directory=UPLOAD_ROOT),
    name="uploads",
)
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
def _make_html_handler(filename: str):
    async def _handler() -> FileResponse:
        return FileResponse(ROOT / filename)

    return _handler


for _page in ("index.html", "apropos.html", "admissions.html", "galerie.html"):
    app.add_api_route(
        f"/{_page}",
        _make_html_handler(_page),
        methods=["GET"],
        name=f"static_{_page}",
    )


@app.get("/")
async def root_index() -> FileResponse:
    return FileResponse(ROOT / "index.html")


@app.get("/site-i18n.js")
async def site_i18n_js() -> FileResponse:
    return FileResponse(ROOT / "site-i18n.js", media_type="application/javascript")


@app.get("/site-analytics.js")
async def site_analytics_js() -> FileResponse:
    return FileResponse(ROOT / "site-analytics.js", media_type="application/javascript")

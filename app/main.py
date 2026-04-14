from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import admissions, auth, cms, finance, public
from app.config import get_settings

settings = get_settings()
ROOT = Path(__file__).resolve().parents[1]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    upload_dir = ROOT / settings.upload_dir
    upload_dir.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="Les Marinettes API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(cms.router, prefix="/api")
app.include_router(admissions.router, prefix="/api")
app.include_router(finance.router, prefix="/api")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


# --- Static images (content.json references images/uploads/...)
images_dir = ROOT / "images"
if images_dir.is_dir():
    app.mount("/images", StaticFiles(directory=images_dir), name="images")

# --- Static public assets / marketing pages (served from /static)
static_dir = ROOT / "static"
if static_dir.is_dir():
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


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


# --- Public HTML marketing pages (stored in /static, exposed as clean URLs)
def _static_html(filename: str):
    async def _handler() -> FileResponse:
        return FileResponse(static_dir / filename)

    return _handler


# Best practice: clean public URLs (no .html)
app.add_api_route("/apropos", _static_html("apropos.html"), methods=["GET"], name="page_apropos")
app.add_api_route(
    "/admissions", _static_html("admissions.html"), methods=["GET"], name="page_admissions"
)
app.add_api_route("/galerie", _static_html("galerie.html"), methods=["GET"], name="page_galerie")


# Backward-compatible redirects for old .html links (SEO-friendly 301)
@app.get("/index.html")
async def legacy_index_html() -> RedirectResponse:
    return RedirectResponse(url="/", status_code=301)


@app.get("/apropos.html")
async def legacy_apropos_html() -> RedirectResponse:
    return RedirectResponse(url="/apropos", status_code=301)


@app.get("/admissions.html")
async def legacy_admissions_html() -> RedirectResponse:
    return RedirectResponse(url="/admissions", status_code=301)


@app.get("/galerie.html")
async def legacy_galerie_html() -> RedirectResponse:
    return RedirectResponse(url="/galerie", status_code=301)


@app.get("/")
async def root_index() -> FileResponse:
    return FileResponse(static_dir / "index.html")


@app.get("/site-i18n.js")
async def site_i18n_js() -> FileResponse:
    return FileResponse(ROOT / "site-i18n.js", media_type="application/javascript")

from __future__ import annotations

import os
from pathlib import Path

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parents[2]
WEB_ROOT = ROOT / "static"  # public html lives under /static


def _admin_dist() -> Path:
    return ROOT / "frontend" / "dist"


app = FastAPI(title="Les Marinettes Gateway")


# --- Static images (legacy: content.json references images/uploads/...)
images_dir = ROOT / "images"
if images_dir.is_dir():
    app.mount("/images", StaticFiles(directory=images_dir), name="images")


# --- Public site static pages (same behavior as current monolith)
@app.get("/")
async def root_index() -> FileResponse:
    return FileResponse(WEB_ROOT / "index.html")


@app.get("/apropos")
async def page_apropos() -> FileResponse:
    return FileResponse(WEB_ROOT / "apropos.html")


@app.get("/admissions")
async def page_admissions() -> FileResponse:
    return FileResponse(WEB_ROOT / "admissions.html")


@app.get("/galerie")
async def page_galerie() -> FileResponse:
    return FileResponse(WEB_ROOT / "galerie.html")


@app.get("/site-i18n.js")
async def site_i18n_js() -> FileResponse:
    return FileResponse(WEB_ROOT / "site-i18n.js", media_type="application/javascript")


# --- Admin SPA (served from built Vite dist if present)
@app.get("/admin")
@app.get("/admin/")
async def admin_spa_index() -> FileResponse:
    index = _admin_dist() / "index.html"
    if index.is_file():
        return FileResponse(index)
    return FileResponse(ROOT / "admin" / "index.html")


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


# --- Reverse proxy to backend services
#
# Initially, keep everything routed to the existing monolith so we can extract services safely.
# Later, route /api/auth/* to auth-service, /api/finance/* to finance-service, etc.
MONOLITH_URL = os.getenv("GATEWAY_MONOLITH_URL", "http://monolith:8000")


async def _proxy(request: Request, upstream_base: str, upstream_path: str) -> Response:
    url = f"{upstream_base}{upstream_path}"
    async with httpx.AsyncClient(timeout=60.0) as client:
        upstream = await client.request(
            request.method,
            url,
            content=await request.body(),
            headers={k: v for k, v in request.headers.items() if k.lower() != "host"},
            params=request.query_params,
        )
    headers = dict(upstream.headers)
    headers.pop("content-encoding", None)
    headers.pop("transfer-encoding", None)
    headers.pop("connection", None)
    return Response(content=upstream.content, status_code=upstream.status_code, headers=headers)


@app.api_route("/api/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_api(request: Request, full_path: str) -> Response:
    return await _proxy(request, MONOLITH_URL, f"/api/{full_path}")


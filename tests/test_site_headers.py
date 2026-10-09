import hashlib
import re
from pathlib import Path

import pytest
from app.main import app
from app.security_headers import ADMIN_CSP, PUBLIC_CSP, SecurityHeadersMiddleware
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
PAGES = ("/", "/index.html", "/apropos.html", "/admissions.html", "/galerie.html")
client = TestClient(app)


def _digest(name: str) -> str:
    return hashlib.sha256((ROOT / name).read_bytes()).hexdigest()[:12]


@pytest.mark.parametrize("path", PAGES)
def test_pages_reference_scripts_by_content_hash(path: str) -> None:
    response = client.get(path)
    assert response.status_code == 200
    html = response.text
    for script in ("site-i18n.js", "site-analytics.js"):
        assert f'src="{script}?v={_digest(script)}"' in html
    assert len(re.findall(r"site-(?:i18n|analytics)\.js\?v=", html)) == 2


def test_page_sources_carry_no_hand_maintained_version() -> None:
    for page in ("index.html", "apropos.html", "admissions.html", "galerie.html"):
        assert "?v=" not in "".join(
            line
            for line in (ROOT / page).read_text(encoding="utf-8").splitlines()
            if "site-i18n.js" in line or "site-analytics.js" in line
        )


@pytest.mark.parametrize("path", PAGES)
def test_public_pages_get_the_public_policy(path: str) -> None:
    response = client.get(path)
    assert response.headers["content-security-policy"] == PUBLIC_CSP
    assert response.headers["x-frame-options"] == "SAMEORIGIN"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert response.headers["cache-control"] == "no-cache"


def test_admin_gets_the_strict_policy() -> None:
    response = client.get("/admin/")
    assert response.status_code == 200
    policy = response.headers["content-security-policy"]
    assert policy == ADMIN_CSP
    assert "script-src 'self';" in policy
    assert "frame-ancestors 'none'" in policy
    assert response.headers["x-frame-options"] == "DENY"


def test_non_html_responses_get_base_headers_only() -> None:
    response = client.get("/api/health")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "content-security-policy" not in response.headers
    assert "strict-transport-security" not in response.headers


def test_uploaded_media_is_never_sniffed() -> None:
    with TestClient(app) as started:
        response = started.get("/images/uploads/logo.png")
    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"


def test_hsts_is_sent_when_enabled_and_headers_are_not_duplicated() -> None:
    inner = FastAPI()

    @inner.get("/")
    async def page() -> HTMLResponse:
        return HTMLResponse("<p>hi</p>", headers={"X-Frame-Options": "ALLOWALL"})

    inner.add_middleware(SecurityHeadersMiddleware, hsts=True)
    response = TestClient(inner).get("/")
    assert response.headers["strict-transport-security"] == "max-age=31536000"
    assert response.headers.get_list("x-frame-options") == ["SAMEORIGIN"]

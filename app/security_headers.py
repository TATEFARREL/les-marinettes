"""HTTP security headers applied to every response."""

from starlette.types import ASGIApp, Message, Receive, Scope, Send


def _policy(directives: dict[str, str]) -> str:
    return "; ".join(f"{name} {value}" for name, value in directives.items())


_COMMON_DIRECTIVES = {
    "default-src": "'self'",
    "base-uri": "'self'",
    "object-src": "'none'",
    "form-action": "'self'",
    "connect-src": "'self'",
    "font-src": "'self' data:",
    # CMS fields accept external image and video URLs as well as uploads.
    "img-src": "'self' data: blob: https:",
    "media-src": "'self' blob: https:",
}

# The public pages use inline scripts, inline event handlers and the Tailwind
# Play CDN (which injects <style> elements at runtime), so inline code must be
# allowed; script sources are still limited to this site and that CDN.
PUBLIC_CSP = _policy(
    {
        **_COMMON_DIRECTIVES,
        "script-src": "'self' 'unsafe-inline' https://cdn.tailwindcss.com",
        "style-src": "'self' 'unsafe-inline'",
        "frame-src": "https://www.google.com https://maps.google.com",
        "frame-ancestors": "'self'",
    }
)

# The admin build has no inline scripts. Inline styles stay allowed because
# UI libraries (toasts) inject <style> elements.
ADMIN_CSP = _policy(
    {
        **_COMMON_DIRECTIVES,
        "script-src": "'self'",
        "style-src": "'self' 'unsafe-inline'",
        "frame-src": "'none'",
        "frame-ancestors": "'none'",
    }
)

BASE_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
}

HSTS_VALUE = "max-age=31536000"

# FastAPI's own docs pages load Swagger UI from a CDN; they are disabled in production.
_DOCS_PATHS = ("/docs", "/redoc")


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp, *, hsts: bool) -> None:
        self.app = app
        self.hsts = hsts

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        path: str = scope.get("path", "")

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = [
                    (name, value)
                    for name, value in message.get("headers", [])
                    if name.lower() not in _MANAGED_HEADER_NAMES
                ]
                content_type = _header(headers, b"content-type")
                for name, value in BASE_HEADERS.items():
                    headers.append((name.lower().encode(), value.encode()))
                if self.hsts:
                    headers.append((b"strict-transport-security", HSTS_VALUE.encode()))
                if content_type.startswith("text/html") and not path.startswith(_DOCS_PATHS):
                    is_admin = path == "/admin" or path.startswith("/admin/")
                    csp = ADMIN_CSP if is_admin else PUBLIC_CSP
                    frame = b"DENY" if is_admin else b"SAMEORIGIN"
                    headers.append((b"content-security-policy", csp.encode()))
                    headers.append((b"x-frame-options", frame))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_headers)


_MANAGED_HEADER_NAMES = frozenset(
    name.lower().encode()
    for name in (
        *BASE_HEADERS,
        "Strict-Transport-Security",
        "Content-Security-Policy",
        "X-Frame-Options",
    )
)


def _header(headers: list[tuple[bytes, bytes]], name: bytes) -> str:
    for key, value in headers:
        if key.lower() == name:
            return value.decode("latin-1").lower()
    return ""

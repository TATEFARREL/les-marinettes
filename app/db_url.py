"""Normalize Postgres URLs for asyncpg (it does not accept libpq query params like sslmode)."""

from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse


def normalize_database_url_for_asyncpg(database_url: str) -> tuple[str, dict[str, Any]]:
    """
    Strip sslmode / channel_binding from the query string and return connect_args for SSL.

    asyncpg.connect() rejects kwargs like sslmode=... that SQLAlchemy forwards from the URL.
    """
    parsed = urlparse(database_url)
    pairs = parse_qsl(parsed.query, keep_blank_values=True)
    ssl_required = False
    filtered: list[tuple[str, str]] = []
    for k, v in pairs:
        lk = k.lower()
        if lk == "sslmode":
            if v.lower() in ("require", "verify-ca", "verify-full"):
                ssl_required = True
            continue
        if lk == "channel_binding":
            continue
        filtered.append((k, v))

    host = (parsed.hostname or "").lower()
    if host.endswith(".neon.tech") or ".neon.tech" in host:
        ssl_required = True
    if ".render.com" in host:
        ssl_required = True

    new_query = urlencode(filtered)
    clean = urlunparse(parsed._replace(query=new_query))

    connect_args: dict[str, Any] = {}
    if ssl_required:
        connect_args["ssl"] = True

    return clean, connect_args

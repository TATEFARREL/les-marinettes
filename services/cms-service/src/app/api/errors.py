from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("app.api.errors")


def _envelope(*, code: str, message: str, request_id: str | None) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "request_id": request_id}}


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        rid = request.headers.get("x-request-id")
        code = f"http_{exc.status_code}"
        msg = str(exc.detail) if exc.detail else "HTTP error"
        return JSONResponse(
            _envelope(code=code, message=msg, request_id=rid),
            status_code=exc.status_code,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        rid = request.headers.get("x-request-id")
        return JSONResponse(
            _envelope(code="validation_error", message="Invalid request", request_id=rid),
            status_code=422,
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        rid = request.headers.get("x-request-id")
        logger.exception("Unhandled exception", extra={"request_id": rid})
        return JSONResponse(
            _envelope(code="internal_error", message="Internal server error", request_id=rid),
            status_code=500,
        )

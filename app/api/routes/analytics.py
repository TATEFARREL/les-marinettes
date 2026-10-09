import hashlib
import hmac
from datetime import UTC, date, datetime, timedelta
from urllib.parse import urlparse

from fastapi import APIRouter, Query, Request, Response, status
from sqlalchemy import Date, cast, distinct, func, select

from app.api.deps import AdminUser, SessionDep
from app.config import get_settings
from app.models.analytics import PageView
from app.schemas.analytics import PageViewCreate

router = APIRouter(prefix="/analytics", tags=["analytics"])
settings = get_settings()


def _hash_session(session_id: str) -> str:
    return hmac.new(
        settings.secret_key.encode("utf-8"),
        session_id.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _device(user_agent: str) -> str:
    agent = user_agent.lower()
    if "bot" in agent or "crawler" in agent or "spider" in agent:
        return "bot"
    if "ipad" in agent or "tablet" in agent:
        return "tablet"
    if "mobile" in agent or "android" in agent or "iphone" in agent:
        return "mobile"
    return "desktop"


@router.post("/page-view", status_code=status.HTTP_204_NO_CONTENT)
async def record_page_view(
    session: SessionDep,
    request: Request,
    body: PageViewCreate,
) -> Response:
    device = _device(request.headers.get("user-agent", ""))
    if device == "bot" or request.headers.get("dnt") == "1":
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    referrer_host: str | None = None
    if body.referrer:
        referrer_host = urlparse(body.referrer).hostname

    session.add(
        PageView(
            session_hash=_hash_session(body.session_id),
            path=body.path.split("?", 1)[0],
            referrer_host=referrer_host,
            device=device,
        )
    )
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/summary")
async def analytics_summary(
    session: SessionDep,
    _: AdminUser,
    days: int = Query(default=30, ge=7, le=90),
) -> dict:
    now = datetime.now(UTC)
    start = now - timedelta(days=days - 1)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    totals = await session.execute(
        select(
            func.count(PageView.id),
            func.count(distinct(PageView.session_hash)),
        ).where(PageView.occurred_at >= start)
    )
    page_views, visitors = totals.one()

    today_totals = await session.execute(
        select(
            func.count(PageView.id),
            func.count(distinct(PageView.session_hash)),
        ).where(PageView.occurred_at >= today_start)
    )
    today_page_views, today_visitors = today_totals.one()

    day_column = cast(PageView.occurred_at, Date)
    daily_result = await session.execute(
        select(
            day_column.label("day"),
            func.count(PageView.id),
            func.count(distinct(PageView.session_hash)),
        )
        .where(PageView.occurred_at >= start)
        .group_by(day_column)
        .order_by(day_column)
    )
    daily_by_date = {
        row[0]: {"page_views": row[1], "visitors": row[2]} for row in daily_result.all()
    }
    daily = []
    for offset in range(days):
        current: date = (start + timedelta(days=offset)).date()
        counts = daily_by_date.get(current, {"page_views": 0, "visitors": 0})
        daily.append({"date": current.isoformat(), **counts})

    top_result = await session.execute(
        select(PageView.path, func.count(PageView.id).label("views"))
        .where(PageView.occurred_at >= start)
        .group_by(PageView.path)
        .order_by(func.count(PageView.id).desc())
        .limit(8)
    )

    return {
        "period_days": days,
        "page_views": page_views,
        "visitors": visitors,
        "today": {"page_views": today_page_views, "visitors": today_visitors},
        "daily": daily,
        "top_pages": [{"path": row[0], "views": row[1]} for row in top_result.all()],
    }

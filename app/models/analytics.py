from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PageView(Base):
    __tablename__ = "page_views"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    path: Mapped[str] = mapped_column(String(512), index=True, nullable=False)
    referrer_host: Mapped[str | None] = mapped_column(String(255), nullable=True)
    device: Mapped[str] = mapped_column(String(32), nullable=False, default="desktop")
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True, nullable=False
    )

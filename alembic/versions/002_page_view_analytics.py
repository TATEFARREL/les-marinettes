"""page view analytics

Revision ID: 002
Revises: 001
Create Date: 2026-10-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: str | None = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "page_views",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_hash", sa.String(length=64), nullable=False),
        sa.Column("path", sa.String(length=512), nullable=False),
        sa.Column("referrer_host", sa.String(length=255), nullable=True),
        sa.Column("device", sa.String(length=32), nullable=False),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_page_views_occurred_at"), "page_views", ["occurred_at"])
    op.create_index(op.f("ix_page_views_path"), "page_views", ["path"])
    op.create_index(op.f("ix_page_views_session_hash"), "page_views", ["session_hash"])


def downgrade() -> None:
    op.drop_index(op.f("ix_page_views_session_hash"), table_name="page_views")
    op.drop_index(op.f("ix_page_views_path"), table_name="page_views")
    op.drop_index(op.f("ix_page_views_occurred_at"), table_name="page_views")
    op.drop_table("page_views")

"""add user profile fields

Revision ID: 004_add_user_profile_fields
Revises: 003_convert_ids_to_uuid
Create Date: 2026-04-14

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "004_add_user_profile_fields"
down_revision = "003_convert_ids_to_uuid"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("name", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("surname", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("username", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("phone_number", sa.String(length=20), nullable=True))
    op.add_column(
        "users",
        sa.Column("is_blocked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column("users", sa.Column("image_s3_path", sa.String(length=1024), nullable=True))
    op.add_column(
        "users",
        sa.Column("primary_group_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "modified_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # Indexes/constraints
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_phone_number", "users", ["phone_number"], unique=True)
    op.create_index("ix_users_primary_group_id", "users", ["primary_group_id"])
    op.create_foreign_key(
        "users_primary_group_id_fkey",
        "users",
        "groups",
        ["primary_group_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Make required columns NOT NULL after backfill
    op.execute("UPDATE users SET name = COALESCE(name, '')")
    op.execute("UPDATE users SET surname = COALESCE(surname, '')")
    op.execute("UPDATE users SET username = COALESCE(username, split_part(email, '@', 1))")

    op.alter_column("users", "name", nullable=False)
    op.alter_column("users", "surname", nullable=False)
    op.alter_column("users", "username", nullable=False)

    # Remove defaults
    op.alter_column("users", "is_blocked", server_default=None)
    op.alter_column("users", "modified_at", server_default=None)


def downgrade() -> None:
    op.drop_constraint("users_primary_group_id_fkey", "users", type_="foreignkey")
    op.drop_index("ix_users_primary_group_id", table_name="users")
    op.drop_index("ix_users_phone_number", table_name="users")
    op.drop_index("ix_users_username", table_name="users")

    op.drop_column("users", "modified_at")
    op.drop_column("users", "primary_group_id")
    op.drop_column("users", "image_s3_path")
    op.drop_column("users", "is_blocked")
    op.drop_column("users", "phone_number")
    op.drop_column("users", "username")
    op.drop_column("users", "surname")
    op.drop_column("users", "name")

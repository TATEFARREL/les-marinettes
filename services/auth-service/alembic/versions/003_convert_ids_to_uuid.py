"""convert users/groups ids to uuid

Revision ID: 003_convert_ids_to_uuid
Revises: 002_create_groups
Create Date: 2026-04-14

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "003_convert_ids_to_uuid"
down_revision = "002_create_groups"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use pgcrypto for gen_random_uuid()
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # --- users: create uuid id alongside int id, backfill, then swap
    op.add_column(
        "users",
        sa.Column(
            "id_uuid",
            postgresql.UUID(as_uuid=True),
            nullable=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
    )
    op.execute("UPDATE users SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL")
    op.alter_column("users", "id", new_column_name="id_int")

    # --- groups: create uuid id alongside int id, backfill, then swap
    op.add_column(
        "groups",
        sa.Column(
            "id_uuid",
            postgresql.UUID(as_uuid=True),
            nullable=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
    )
    op.execute("UPDATE groups SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL")
    op.alter_column("groups", "id", new_column_name="id_int")

    # --- group_memberships: migrate FK columns
    op.add_column(
        "group_memberships",
        sa.Column("user_id_uuid", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "group_memberships",
        sa.Column("group_id_uuid", postgresql.UUID(as_uuid=True), nullable=True),
    )

    # Backfill via join from old integer ids to new uuid ids.
    op.execute(
        """
        UPDATE group_memberships gm
        SET user_id_uuid = u.id_uuid
        FROM users u
        WHERE gm.user_id = u.id_int
        """
    )
    op.execute(
        """
        UPDATE group_memberships gm
        SET group_id_uuid = g.id_uuid
        FROM groups g
        WHERE gm.group_id = g.id_int
        """
    )

    # Drop old constraints/indexes depending on old columns
    op.drop_constraint("uq_group_memberships_group_user", "group_memberships", type_="unique")

    op.drop_index("ix_group_memberships_user_id", table_name="group_memberships")
    op.drop_index("ix_group_memberships_group_id", table_name="group_memberships")

    op.drop_constraint("group_memberships_group_id_fkey", "group_memberships", type_="foreignkey")
    op.drop_constraint("group_memberships_user_id_fkey", "group_memberships", type_="foreignkey")

    # Replace membership fk columns
    op.drop_column("group_memberships", "user_id")
    op.drop_column("group_memberships", "group_id")

    op.alter_column("group_memberships", "user_id_uuid", new_column_name="user_id", nullable=False)
    op.alter_column(
        "group_memberships", "group_id_uuid", new_column_name="group_id", nullable=False
    )

    op.create_foreign_key(
        "group_memberships_user_id_fkey",
        "group_memberships",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "group_memberships_group_id_fkey",
        "group_memberships",
        "groups",
        ["group_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.create_index("ix_group_memberships_group_id", "group_memberships", ["group_id"])
    op.create_index("ix_group_memberships_user_id", "group_memberships", ["user_id"])
    op.create_unique_constraint(
        "uq_group_memberships_group_user",
        "group_memberships",
        ["group_id", "user_id"],
    )

    # --- Swap users/groups PKs to uuid and drop old int columns
    op.drop_constraint("users_pkey", "users", type_="primary")
    op.drop_constraint("groups_pkey", "groups", type_="primary")

    op.drop_column("users", "id_int")
    op.drop_column("groups", "id_int")

    op.alter_column("users", "id_uuid", new_column_name="id", nullable=False)
    op.alter_column("groups", "id_uuid", new_column_name="id", nullable=False)

    op.create_primary_key("users_pkey", "users", ["id"])
    op.create_primary_key("groups_pkey", "groups", ["id"])

    # Remove server defaults used during migration
    op.alter_column("users", "id", server_default=None)
    op.alter_column("groups", "id", server_default=None)


def downgrade() -> None:
    raise RuntimeError("Downgrade not supported for UUID primary key migration")

"""bootstrap secure administrator

Revision ID: 003
Revises: 002
Create Date: 2026-10-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ADMIN_EMAIL = "admin@lesmarinettes.org"
ADMIN_PASSWORD_HASH = "$2b$12$FkpUxZtr.fh9WniEzWc57Om8W/A.WYkOPlFJtygzm3F1WrIcj08ti"


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            INSERT INTO users (email, hashed_password, role, is_active)
            VALUES (:email, :password_hash, 'admin', true)
            ON CONFLICT (email) DO UPDATE
            SET hashed_password = EXCLUDED.hashed_password,
                role = 'admin',
                is_active = true
            """
        ).bindparams(email=ADMIN_EMAIL, password_hash=ADMIN_PASSWORD_HASH)
    )


def downgrade() -> None:
    # Keep the administrator intact if the schema migration is rolled back.
    pass

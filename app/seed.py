"""Load initial site_content from content.json and create default admin user."""

import asyncio
import json
import sys
from pathlib import Path

from sqlalchemy import func, select

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.site_content import SiteContent
from app.models.user import User, UserRole
from app.security import hash_password

settings = get_settings()
ROOT = Path(__file__).resolve().parents[1]


async def run_seed() -> None:
    content_path = ROOT / settings.content_json_path
    if not content_path.is_file():
        print(f"Missing {content_path}", file=sys.stderr)
        sys.exit(1)
    payload = json.loads(content_path.read_text(encoding="utf-8"))

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SiteContent).where(SiteContent.id == settings.site_content_row_id)
        )
        row = result.scalar_one_or_none()
        if row is None:
            row = SiteContent(id=settings.site_content_row_id, payload=payload)
            session.add(row)
            print("Inserted site_content")
        else:
            row.payload = payload
            session.add(row)
            print("Updated site_content")

        count = await session.execute(select(func.count()).select_from(User))
        if count.scalar_one() == 0:
            admin = User(
                email="admin@example.com",
                hashed_password=hash_password("changeme"),
                role=UserRole.admin,
                is_active=True,
            )
            session.add(admin)
            print("Created admin user admin@example.com / changeme")

        await session.commit()


def main() -> None:
    asyncio.run(run_seed())


if __name__ == "__main__":
    main()

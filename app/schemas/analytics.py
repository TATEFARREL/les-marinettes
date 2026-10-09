from pydantic import BaseModel, Field, field_validator


class PageViewCreate(BaseModel):
    session_id: str = Field(min_length=16, max_length=128)
    path: str = Field(min_length=1, max_length=512)
    referrer: str | None = Field(default=None, max_length=2048)

    @field_validator("path")
    @classmethod
    def public_path_only(cls, value: str) -> str:
        path = value.strip()
        if not path.startswith("/") or path.startswith("/admin"):
            raise ValueError("Invalid public path")
        return path
